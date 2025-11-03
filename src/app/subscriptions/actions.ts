
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Subscription, SubscriptionInstallment, Payment, SubscriptionStatus, JournalEntry, Client, Supplier } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { addMonths, format, parseISO, endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { getSettings } from '@/app/settings/actions';
import { createNotification } from '../notifications/actions';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { cache } from 'react';
import { postJournalEntry } from '@/lib/finance/postJournal';
import { normalizeFinanceAccounts } from '@/lib/finance/finance-accounts';

const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;

    // Create a deep copy to avoid mutating the original data by serializing and deserializing
    const safeData = JSON.parse(JSON.stringify({ ...data, id: doc.id }));

    // Recursively find and convert date-like objects
    const convertDates = (obj: any) => {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key].hasOwnProperty('_seconds') && obj[key].hasOwnProperty('nanoseconds')) {
                    obj[key] = new Date(obj[key]._seconds * 1000).toISOString();
                } else if (obj[key] instanceof Date) {
                    obj[key] = obj[key].toISOString();
                } else {
                    convertDates(obj[key]);
                }
            }
        }
    };

    convertDates(safeData);
    return safeData;
};


export const getSubscriptions = cache(async (includeDeleted = false): Promise<Subscription[]> => {
    const db = await getDb();
    if (!db) {
        console.error("Database not available, returning empty subscriptions list.");
        return [];
    }
    const settings = await getSettings();
    if (!settings.databaseStatus?.isDatabaseConnected) {
        console.log("Database connection is disabled in settings. Skipping getSubscriptions fetch.");
        return [];
    }

    try {
        let query: FirebaseFirestore.Query = db.collection('subscriptions').orderBy('purchaseDate', 'desc');

        const snapshot = await query.get();
        if (snapshot.empty) {
            return [];
        }

        const allSubscriptions: Subscription[] = snapshot.docs.map(doc => processDoc(doc) as Subscription);

        // Fetch client data and attach it
        const clientIds = [...new Set(allSubscriptions.map(s => s.clientId))];
        if (clientIds.length > 0) {
            const clientsSnapshot = await db.collection('clients').where(FieldPath.documentId(), 'in', clientIds).get();
            const clientsData = new Map(clientsSnapshot.docs.map(doc => [doc.id, doc.data() as Client]));
            allSubscriptions.forEach(sub => {
                if (clientsData.has(sub.clientId)) {
                    sub.client = clientsData.get(sub.clientId);
                }
            });
        }
        
        if (includeDeleted) {
            return allSubscriptions.filter(s => s.isDeleted);
        } else {
            return allSubscriptions.filter(s => !s.isDeleted);
        }

    } catch (error) {
        console.error("Error getting subscriptions from Firestore: ", String(error));
        return [];
    }
});

export const getSubscriptionById = cache(async (id: string): Promise<Subscription | null> => {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection('subscriptions').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        
        const subscriptionData = processDoc(doc) as Subscription;
        
        const clientDoc = await db.collection('clients').doc(subscriptionData.clientId).get();
        if(clientDoc.exists) {
            (subscriptionData as any).client = clientDoc.data() as Client;
        }
        
        return subscriptionData;

    } catch (error) {
        console.error(`Error getting subscription by ID ${id}:`, error);
        return null;
    }
});


export async function addSubscription(subscriptionData: Omit<Subscription, 'id' | 'profit' | 'paidAmount' | 'status'> & { installments?: { dueDate: string, amount: number }[], deferredDueDate?: string }) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated" };
    
    const settings = await getSettings();
    const financeSettings = normalizeFinanceAccounts(settings.financeAccounts);
    
    const subSettings = settings.subscriptionSettings;

    const batch = db.batch();
    const subscriptionRef = db.collection('subscriptions').doc();

    try {
        const totalPurchase = (subscriptionData.quantity || 1) * (subscriptionData.purchasePrice || 0);
        const totalSale = ((subscriptionData.quantity || 1) * (subscriptionData.unitPrice || 0)) - (subscriptionData.discount || 0);
        const profit = totalSale - totalPurchase;
        const newInvoiceNumber = await getNextVoucherNumber('SUB');
        
        const { installments, deferredDueDate, ...coreSubscriptionData } = subscriptionData;

        const finalSubscriptionData: Omit<Subscription, 'id'> = {
            ...coreSubscriptionData,
            purchaseDate: new Date(subscriptionData.purchaseDate).toISOString(),
            startDate: new Date(subscriptionData.startDate).toISOString(),
            invoiceNumber: newInvoiceNumber,
            purchasePrice: totalPurchase,
            salePrice: totalSale,
            profit,
            paidAmount: 0,
            status: 'Active',
            isDeleted: false,
            updatedAt: new Date().toISOString(),
        };
        batch.set(subscriptionRef, finalSubscriptionData);

        // Generate installments based on payment method
        const installmentsToCreate: Omit<SubscriptionInstallment, 'id'>[] = [];
        
        switch (subscriptionData.installmentMethod) {
            case 'upfront':
                installmentsToCreate.push({
                    subscriptionId: subscriptionRef.id, clientName: finalSubscriptionData.clientName, serviceName: finalSubscriptionData.serviceName,
                    amount: totalSale, currency: finalSubscriptionData.currency, dueDate: finalSubscriptionData.startDate,
                    status: 'Unpaid', paidAmount: 0, discount: 0,
                });
                break;
            case 'deferred':
                 if (!deferredDueDate) throw new Error("Deferred due date is required for deferred payment method.");
                installmentsToCreate.push({
                    subscriptionId: subscriptionRef.id, clientName: finalSubscriptionData.clientName, serviceName: finalSubscriptionData.serviceName,
                    amount: totalSale, currency: finalSubscriptionData.currency, dueDate: new Date(deferredDueDate).toISOString(),
                    status: 'Unpaid', paidAmount: 0, discount: 0,
                });
                break;
            case 'installments':
                if (!installments || installments.length === 0) throw new Error("Installments data is required for installments payment method.");
                installments.forEach(inst => {
                    installmentsToCreate.push({
                        subscriptionId: subscriptionRef.id, clientName: finalSubscriptionData.clientName, serviceName: finalSubscriptionData.serviceName,
                        amount: inst.amount, currency: finalSubscriptionData.currency, dueDate: inst.dueDate,
                        status: 'Unpaid', paidAmount: 0, discount: 0,
                    });
                });
                break;
        }

        installmentsToCreate.forEach(instData => {
            const installmentRef = db.collection('subscription_installments').doc();
            batch.set(installmentRef, instData);
        });

        await postJournalEntry({
            sourceType: 'subscription',
            sourceId: subscriptionRef.id,
            description: `إيراد اشتراك خدمة ${finalSubscriptionData.serviceName}`,
            entries: [
                { accountId: finalSubscriptionData.clientId, debit: totalSale, credit: 0, currency: finalSubscriptionData.currency },
                { accountId: financeSettings.revenueMap.subscriptions, debit: 0, credit: totalSale, currency: finalSubscriptionData.currency }
            ]
        });

        if (totalPurchase > 0) {
           await postJournalEntry({
                sourceType: 'subscription_cost',
                sourceId: subscriptionRef.id,
                description: `تكلفة اشتراك خدمة ${finalSubscriptionData.serviceName}`,
                entries: [
                    { accountId: financeSettings.expenseMap.subscriptions, debit: totalPurchase, credit: 0, currency: finalSubscriptionData.currency },
                    { accountId: finalSubscriptionData.supplierId, debit: 0, credit: totalPurchase, currency: finalSubscriptionData.currency }
                ]
            });
        }
        
        batch.update(db.collection('clients').doc(finalSubscriptionData.clientId), { useCount: FieldValue.increment(1) });
        if (finalSubscriptionData.supplierId) {
            batch.update(db.collection('clients').doc(finalSubscriptionData.supplierId), { useCount: FieldValue.increment(1) });
        }
        if(finalSubscriptionData.boxId) {
             batch.update(db.collection('boxes').doc(finalSubscriptionData.boxId), { useCount: FieldValue.increment(1) });
        }


        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'SUBSCRIPTION',
            description: `أنشأ اشتراكًا جديدًا: "${finalSubscriptionData.serviceName}" للعميل ${finalSubscriptionData.clientName}.`,
            targetId: subscriptionRef.id,
        });

        await createNotification({
            userId: user.uid,
            title: 'تم إنشاء اشتراك جديد',
            body: `تم إنشاء اشتراك "${finalSubscriptionData.serviceName}" للعميل ${finalSubscriptionData.clientName}.`,
            type: 'system',
            link: `/subscriptions`
        });

        revalidatePath('/subscriptions');

        return { success: true, id: subscriptionRef.id };
    } catch (error) {
        console.error("Error adding subscription: ", String(error));
        return { success: false, error: "Failed to add subscription." };
    }
}


export const getSubscriptionInstallments = cache(async (subscriptionId: string): Promise<SubscriptionInstallment[]> => {
    const db = await getDb();
    if (!db) {
        console.error("Database not available, returning empty installments list.");
        return [];
    }
    try {
        const snapshot = await db.collection('subscription_installments')
            .where('subscriptionId', '==', subscriptionId)
            .orderBy('dueDate', 'asc') // This requires a composite index
            .get();
        
        if (snapshot.empty) return [];
        
        const installments = snapshot.docs.map(doc => processDoc(doc) as SubscriptionInstallment);

        return installments;

    } catch (error) {
        console.error("Error getting subscription installments: ", String(error));
        throw new Error("Failed to fetch subscription installments.");
    }
});

export const getSubscriptionInstallmentsForAll = cache(async (): Promise<SubscriptionInstallment[]> => {
    const db = await getDb();
    if (!db) {
        console.error("Database not available, returning empty installments list.");
        return [];
    }
    const settings = await getSettings();
    if (!settings.databaseStatus?.isDatabaseConnected) {
        console.log("Database connection is disabled in settings. Skipping getSubscriptionInstallmentsForAll fetch.");
        return [];
    }
    
    try {
        const snapshot = await db.collection('subscription_installments').orderBy('dueDate', 'asc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => processDoc(doc) as SubscriptionInstallment);
    } catch (error) {
        console.error("Error getting all subscription installments: ", String(error));
        return [];
    }
});

export const getInstallmentPayments = cache(async (installmentId: string): Promise<Payment[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection('payments')
            .where('subscriptionInstallmentId', '==', installmentId)
            .get();
            
        if (snapshot.empty) return [];

        const payments = snapshot.docs.map(doc => processDoc(doc) as Payment);
        payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return payments;

    } catch (error) {
        console.error(`Error getting payments for installment ${installmentId}:`, error);
        return [];
    }
});

export async function paySubscriptionInstallment(
    installmentId: string,
    boxId: string,
    paymentAmount: number,
    paymentCurrency: 'USD' | 'IQD',
    exchangeRate?: number,
    discount?: number
) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const installmentDocRef = db.collection('subscription_installments').doc(installmentId);
    
    try {
        return await db.runTransaction(async (transaction) => {
            const installmentDoc = await transaction.get(installmentDocRef);
            if (!installmentDoc.exists) throw new Error("Installment not found!");
            
            const installment = { id: installmentDoc.id, ...installmentDoc.data() } as SubscriptionInstallment;
            
            const subscriptionRef = db.collection('subscriptions').doc(installment.subscriptionId);
            const subscriptionDoc = await transaction.get(subscriptionRef);
            if (!subscriptionDoc.exists) throw new Error("Subscription not found!");
            const subscriptionData = subscriptionDoc.data() as Subscription;

            const allInstallmentsSnapshot = await transaction.get(db.collection('subscription_installments').where('subscriptionId', '==', installment.subscriptionId));
            
            const discountAmount = discount || 0;
            const totalAmountToCreditToClient = paymentAmount + discountAmount;
            
            const journalVoucherId = await postJournalEntry({
                sourceType: "journal_from_installment",
                sourceId: installmentId,
                description: `سداد دفعة اشتراك خدمة: ${subscriptionData.serviceName}`,
                entries: [
                    { accountId: boxId, debit: totalAmountToCreditToClient, credit: 0, currency: paymentCurrency },
                    { accountId: subscriptionData.clientId, debit: 0, credit: totalAmountToCreditToClient, currency: paymentCurrency }
                ]
            });
            
            let remainingPaymentToApply = paymentAmount;
            let remainingDiscountToApply = discountAmount;

            const unpaidInstallments = allInstallmentsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionInstallment))
                .filter(inst => inst.status === 'Unpaid')
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

            for (const inst of unpaidInstallments) {
                if (remainingPaymentToApply <= 0 && remainingDiscountToApply <= 0) break;

                const installmentRef = db.collection('subscription_installments').doc(inst.id);
                const dueOnInstallment = (inst.amount || 0) - (inst.paidAmount || 0) - (inst.discount || 0);
                if (dueOnInstallment <= 0) continue;

                const paymentApplied = Math.min(remainingPaymentToApply, dueOnInstallment);
                const discountApplied = Math.min(remainingDiscountToApply, dueOnInstallment - paymentApplied);

                if (paymentApplied > 0) {
                    transaction.update(installmentRef, { paidAmount: FieldValue.increment(paymentApplied) });
                }
                if (discountApplied > 0) {
                    transaction.update(installmentRef, { discount: FieldValue.increment(discountApplied) });
                }
                
                remainingPaymentToApply -= paymentApplied;
                remainingDiscountToApply -= discountApplied;

                const newPaid = (inst.paidAmount || 0) + paymentApplied;
                const newDiscount = (inst.discount || 0) + discountApplied;

                if ((newPaid + newDiscount) >= inst.amount - 0.01) {
                    transaction.update(installmentRef, { status: 'Paid', paidAt: new Date().toISOString() });
                }

                if ((paymentApplied + discountApplied) > 0) {
                    const paymentRef = db.collection('payments').doc();
                    transaction.set(paymentRef, {
                        subscriptionInstallmentId: inst.id,
                        amount: paymentApplied,
                        discount: discountApplied,
                        currency: inst.currency,
                        date: new Date().toISOString(),
                        journalVoucherId: journalVoucherId,
                        paidBy: user.name,
                    });
                }
            }

            transaction.update(subscriptionRef, { paidAmount: FieldValue.increment(totalAmountToCreditToClient) });

            if (remainingPaymentToApply > 0.01) {
                 await postJournalEntry({
                    sourceType: 'overpayment',
                    sourceId: installment.subscriptionId,
                    description: `رصيد إضافي بعد سداد كل الدفعات لـ ${subscriptionData.clientName}`,
                    entries: [
                        { accountId: boxId, debit: remainingPaymentToApply, credit: 0, currency: paymentCurrency },
                        { accountId: subscriptionData.clientId, debit: 0, credit: remainingPaymentToApply, currency: paymentCurrency }
                    ]
                });
            }
            
            const finalSubscriptionPaidAmount = (subscriptionData.paidAmount || 0) + totalAmountToCreditToClient;
            if (finalSubscriptionPaidAmount >= subscriptionData.salePrice - 0.01) {
                 transaction.update(subscriptionRef, { status: 'Paid' });
            }

            return { success: true };
        });

    } catch (error: any) {
        console.error("Error paying subscription installment:", String(error));
        return { success: false, error: error.message || "Failed to process payment." };
    }
}


export async function deletePayment(paymentId: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        const paymentRef = db.collection('payments').doc(paymentId);
        
        return await db.runTransaction(async (transaction) => {
            const paymentDoc = await transaction.get(paymentRef);
            if (!paymentDoc.exists) throw new Error("Payment not found.");
            const payment = paymentDoc.data() as Payment;

            const installmentRef = db.collection('subscription_installments').doc(payment.subscriptionInstallmentId!);
            const installmentDoc = await transaction.get(installmentRef);
            if (!installmentDoc.exists) throw new Error("Installment not found.");
            const installment = installmentDoc.data() as SubscriptionInstallment;
            
            const subscriptionRef = db.collection('subscriptions').doc(installment.subscriptionId);
            const journalRef = db.collection('journal-vouchers').doc(payment.journalVoucherId!);
            
            const originalJournalDoc = await transaction.get(journalRef);
            if (!originalJournalDoc.exists) throw new Error("Original journal voucher not found.");
            const originalJournal = originalJournalDoc.data() as any;

            await postJournalEntry({
                sourceType: 'reversal',
                sourceId: payment.journalVoucherId!,
                description: `عكس قيد سداد دفعة رقم: ${originalJournal.invoiceNumber}`,
                entries: [
                    { accountId: originalJournal.creditEntries[0].accountId, debit: payment.amount + (payment.discount || 0), credit: 0, currency: payment.currency },
                    { accountId: originalJournal.debitEntries[0].accountId, debit: 0, credit: payment.amount + (payment.discount || 0), currency: payment.currency }
                ]
            });

            const totalAmountToReverse = payment.amount + (payment.discount || 0);

            transaction.update(subscriptionRef, { paidAmount: FieldValue.increment(-totalAmountToReverse), status: 'Active' });
            transaction.update(installmentRef, { 
                paidAmount: FieldValue.increment(-payment.amount), 
                discount: FieldValue.increment(-(payment.discount || 0)),
                status: 'Unpaid' 
            });

            transaction.delete(paymentRef);
            
            return { success: true };
        });

    } catch (error: any) {
        console.error("Error deleting payment:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePayment(paymentId: string, newData: { amount?: number; date?: string; notes?: string }) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const paymentRef = db.collection('payments').doc(paymentId);
    
    try {
        return await db.runTransaction(async (transaction) => {
            const paymentDoc = await transaction.get(paymentRef);
            if (!paymentDoc.exists) throw new Error("Payment not found.");
            const oldPayment = paymentDoc.data() as Payment;
            
            const installmentRef = db.collection('subscription_installments').doc(oldPayment.subscriptionInstallmentId!);
            const installmentDoc = await transaction.get(installmentRef);
            if (!installmentDoc.exists) throw new Error("Installment not found.");
            const installment = installmentDoc.data() as SubscriptionInstallment;
            
            const subscriptionRef = db.collection('subscriptions').doc(installment.subscriptionId);
            const originalJournalRef = db.collection('journal-vouchers').doc(oldPayment.journalVoucherId!);

            const amountDifference = (newData.amount ?? oldPayment.amount) - oldPayment.amount;

            if (Math.abs(amountDifference) > 0.01) {
                const originalJournalDoc = await transaction.get(originalJournalRef);
                const originalJournal = originalJournalDoc.data() as JournalVoucher;
                const notes = `تعديل دفعة اشتراك: ${oldPayment.id}`;

                await postJournalEntry({
                    sourceType: 'adjustment',
                    sourceId: paymentId,
                    description: notes,
                    entries: [
                        { accountId: amountDifference > 0 ? (originalJournal.debitEntries[0].accountId) : originalJournal.creditEntries[0].accountId, debit: Math.abs(amountDifference), credit: 0, currency: oldPayment.currency },
                        { accountId: amountDifference > 0 ? originalJournal.creditEntries[0].accountId : (originalJournal.debitEntries[0].accountId), debit: 0, credit: Math.abs(amountDifference), currency: oldPayment.currency }
                    ]
                });
            }
            
            const updatedPaymentData = { ...newData };
            if (newData.date) updatedPaymentData.date = new Date(newData.date).toISOString();
            transaction.update(paymentRef, updatedPaymentData);

            if (amountDifference !== 0) {
                transaction.update(installmentRef, { paidAmount: FieldValue.increment(amountDifference) });
                transaction.update(subscriptionRef, { paidAmount: FieldValue.increment(amountDifference) });
            }
            
            return { success: true };
        });
    } catch(e: any) {
         console.error("Error updating payment:", e);
        return { success: false, error: e.message };
    }
}


export async function updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus, reason?: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    
    try {
        const updateData: any = { status, updatedAt: new Date().toISOString() };
        if (status === 'Cancelled' || status === 'Suspended') {
            updateData.cancellationDate = new Date().toISOString();
            updateData.cancellationReason = reason || 'لا يوجد سبب محدد';
        } else if (status === 'Active') {
            updateData.cancellationDate = FieldValue.delete();
            updateData.cancellationReason = FieldValue.delete();
        }

        await subscriptionRef.update(updateData);

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'SUBSCRIPTION',
            description: `غير حالة الاشتراك (ID: ${subscriptionId}) إلى ${status}`,
        });

        revalidatePath('/subscriptions');
        revalidatePath(`/subscriptions/${subscriptionId}`);

        return { success: true };

    } catch (error: any) {
        console.error("Error updating subscription status:", String(error));
        return { success: false, error: error.message || "Failed to update status." };
    }
}

export async function softDeleteSubscription(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        await db.collection('subscriptions').doc(id).update({
            isDeleted: true,
            deletedAt: new Date().toISOString(),
        });
        revalidatePath('/subscriptions');
        revalidatePath('/subscriptions/deleted-subscriptions');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function restoreSubscription(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        await db.collection('subscriptions').doc(id).update({
            isDeleted: false,
            deletedAt: FieldValue.delete(),
        });
        revalidatePath('/subscriptions');
        revalidatePath('/subscriptions/deleted-subscriptions');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function permanentDeleteSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
     const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const batch = db.batch();

    try {
        const subRef = db.collection('subscriptions').doc(subscriptionId);
        batch.delete(subRef);

        const installmentsSnap = await db.collection('subscription_installments').where('subscriptionId', '==', subscriptionId).get();
        installmentsSnap.forEach(doc => batch.delete(doc.ref));

        const journalVoucherSnap = await db.collection('journal-vouchers').where('originalData.subscriptionId', '==', subscriptionId).get();
        journalVoucherSnap.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'SUBSCRIPTION',
            description: `حذف الاشتراك بالكامل (ID: ${subscriptionId})`,
        });
        
        revalidatePath('/subscriptions');
        revalidatePath('/subscriptions/deleted-subscriptions');
        revalidatePath('/accounts/vouchers/list');

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting subscription:", String(error));
        return { success: false, error: "Failed to delete subscription and related data." };
    }
}

export async function revalidateSubscriptionsPath() {
    'use server';
    revalidatePath('/subscriptions');
}

    
