

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Subscription, SubscriptionInstallment, Payment, SubscriptionStatus, JournalEntry, Client, Supplier } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { addMonths, format, parseISO } from 'date-fns';
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { getSettings } from '@/app/settings/actions';
import { createNotification } from '../notifications/actions';
import { getCurrentUserFromSession } from '../auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import { getNextVoucherNumber } from '@/lib/sequences';


const processSubscriptionData = (doc: FirebaseFirestore.DocumentSnapshot): Subscription => {
    const data = doc.data() as any;
    return {
        ...data,
        id: doc.id,
        isDeleted: data.isDeleted || false,
        purchaseDate: data.purchaseDate && typeof data.purchaseDate.toDate === 'function' ? data.purchaseDate.toDate().toISOString() : data.purchaseDate,
        startDate: data.startDate && typeof data.startDate.toDate === 'function' ? data.startDate.toDate().toISOString() : data.startDate,
        cancellationDate: data.cancellationDate && typeof data.cancellationDate.toDate === 'function' ? data.cancellationDate.toDate().toISOString() : data.cancellationDate,
        updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as Subscription;
};

export async function getSubscriptions(includeDeleted = false): Promise<Subscription[]> {
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

        const allSubscriptions: Subscription[] = snapshot.docs.map(processSubscriptionData);

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
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection('subscriptions').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        
        const subscriptionData = processSubscriptionData(doc);
        
        const clientDoc = await db.collection('clients').doc(subscriptionData.clientId).get();
        if(clientDoc.exists) {
            (subscriptionData as any).client = clientDoc.data() as Client;
        }
        
        return subscriptionData;

    } catch (error) {
        console.error(`Error getting subscription by ID ${id}:`, error);
        return null;
    }
}


export async function addSubscription(subscriptionData: Omit<Subscription, 'id' | 'profit' | 'paidAmount' | 'status'>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const batch = db.batch();
    const subscriptionRef = db.collection('subscriptions').doc();
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated" };

    try {
        const totalPurchase = (subscriptionData.quantity || 1) * (subscriptionData.purchasePrice || 0);
        const totalSale = ((subscriptionData.quantity || 1) * (subscriptionData.unitPrice || 0)) - (subscriptionData.discount || 0);
        const profit = totalSale - totalPurchase;
        const newInvoiceNumber = await getNextVoucherNumber('SUB');
        
        const finalSubscriptionData: Omit<Subscription, 'id'> = {
            ...subscriptionData,
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

        // Generate installments
        const installmentAmount = parseFloat((totalSale / subscriptionData.numberOfInstallments).toFixed(2));
        const startDate = new Date(subscriptionData.startDate);

        for (let i = 0; i < subscriptionData.numberOfInstallments; i++) {
            const installmentRef = db.collection('subscription_installments').doc();
            const dueDate = addMonths(startDate, i);
            const installmentData: Omit<SubscriptionInstallment, 'id'> = {
                subscriptionId: subscriptionRef.id,
                clientName: subscriptionData.clientName,
                serviceName: subscriptionData.serviceName,
                amount: installmentAmount,
                currency: subscriptionData.currency,
                dueDate: dueDate.toISOString(),
                status: 'Unpaid',
                paidAmount: 0,
                discount: 0,
            };
            batch.set(installmentRef, installmentData);
        }
        
        // Create initial journal entry for the subscription sale
        const journalVoucherRef = db.collection('journal-vouchers').doc();
        
        const debitEntries: JournalEntry[] = [
            { accountId: subscriptionData.clientId, amount: totalSale, description: `اشتراك خدمة: ${subscriptionData.serviceName}` },
            { accountId: 'expense_subscriptions', amount: totalPurchase, description: `تكلفة اشتراك: ${subscriptionData.serviceName}` }
        ];
        const creditEntries: JournalEntry[] = [
            { accountId: subscriptionData.supplierId, amount: totalPurchase, description: `مستحقات اشتراك: ${subscriptionData.serviceName}` },
            { accountId: 'revenue_subscriptions', amount: totalSale, description: `إيراد اشتراك: ${subscriptionData.serviceName}` }
        ];

        batch.set(journalVoucherRef, {
            invoiceNumber: newInvoiceNumber,
            date: subscriptionData.purchaseDate,
            currency: subscriptionData.currency,
            exchangeRate: null,
            notes: subscriptionData.notes || `تسجيل اشتراك خدمة ${subscriptionData.serviceName}`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "subscription",
            debitEntries,
            creditEntries,
            isAudited: false,
            isConfirmed: true,
            originalData: { ...finalSubscriptionData, subscriptionId: subscriptionRef.id }, 
        });

        batch.update(db.collection('clients').doc(subscriptionData.clientId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('clients').doc(subscriptionData.supplierId), { useCount: FieldValue.increment(1) });
        if(subscriptionData.boxId) {
             batch.update(db.collection('boxes').doc(subscriptionData.boxId), { useCount: FieldValue.increment(1) });
        }


        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'SUBSCRIPTION',
            description: `أنشأ اشتراكًا جديدًا: "${subscriptionData.serviceName}" للعميل ${subscriptionData.clientName}.`,
        });

        await createNotification({
            userId: user.uid,
            title: 'تم إنشاء اشتراك جديد',
            body: `تم إنشاء اشتراك "${subscriptionData.serviceName}" للعميل ${subscriptionData.clientName}.`,
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


export async function getSubscriptionInstallments(subscriptionId: string): Promise<SubscriptionInstallment[]> {
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
        
        const installments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionInstallment));

        return installments;

    } catch (error) {
        console.error("Error getting subscription installments: ", String(error));
        throw new Error("Failed to fetch subscription installments.");
    }
}

export async function getSubscriptionInstallmentsForAll(): Promise<SubscriptionInstallment[]> {
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
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionInstallment));
    } catch (error) {
        console.error("Error getting all subscription installments: ", String(error));
        return [];
    }
}

export async function getInstallmentPayments(installmentId: string): Promise<Payment[]> {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection('payments')
            .where('subscriptionInstallmentId', '==', installmentId)
            .get();
            
        if (snapshot.empty) return [];

        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return payments;

    } catch (error) {
        console.error(`Error getting payments for installment ${installmentId}:`, error);
        return [];
    }
}

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
        // IMPORTANT: Get any data needed for writes *before* the transaction starts.
        const nextReceiptVoucherNumber = await getNextVoucherNumber('SUBP');

        return await db.runTransaction(async (transaction) => {
            // --- All reads must happen first ---
            const installmentDoc = await transaction.get(installmentDocRef);
            if (!installmentDoc.exists) throw new Error("Installment not found!");
            
            const installment = { id: installmentDoc.id, ...installmentDoc.data() } as SubscriptionInstallment;
            
            const subscriptionRef = db.collection('subscriptions').doc(installment.subscriptionId);
            const subscriptionDoc = await transaction.get(subscriptionRef);
            if (!subscriptionDoc.exists) throw new Error("Subscription not found!");
            const subscriptionData = subscriptionDoc.data() as Subscription;

            const allInstallmentsSnapshot = await transaction.get(db.collection('subscription_installments').where('subscriptionId', '==', installment.subscriptionId));
            
            // --- All writes happen after all reads ---

            const discountAmount = discount || 0;
            const totalAmountToCreditToClient = paymentAmount + discountAmount;
            
            const journalVoucherRef = db.collection('journal-vouchers').doc();
            
            const debitEntries: JournalEntry[] = [{ accountId: boxId, amount: paymentAmount, description: `إيداع قسط من ${subscriptionData.clientName}` }];
            if (discountAmount > 0) {
                 debitEntries.push({ accountId: 'expense_discounts', amount: discountAmount, description: `خصم مكتسب على قسط ${subscriptionData.serviceName}` });
            }
            
            transaction.set(journalVoucherRef, {
                invoiceNumber: nextReceiptVoucherNumber,
                date: new Date().toISOString(),
                currency: paymentCurrency,
                exchangeRate: exchangeRate || null,
                notes: `سداد قسط اشتراك خدمة: ${subscriptionData.serviceName}`,
                createdBy: user.uid, officer: user.name, createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), voucherType: 'journal_from_installment',
                debitEntries,
                creditEntries: [{ accountId: subscriptionData.clientId, amount: totalAmountToCreditToClient, description: `تسديد دين قسط اشتراك ${subscriptionData.serviceName}` }],
                isAudited: true, isConfirmed: true,
                originalData: { ...installment, paymentAmount, boxId, discount: discountAmount }
            });
            
            // --- Logic to apply payment and discount across installments ---
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
                        journalVoucherId: journalVoucherRef.id,
                        invoiceNumber: nextReceiptVoucherNumber,
                        boxId: boxId,
                        paidBy: user.name,
                    });
                }
            }

            // Update main subscription `paidAmount` with the total credited amount
            transaction.update(subscriptionRef, { paidAmount: FieldValue.increment(totalAmountToCreditToClient) });

            // Overpayment logic
            if (remainingPaymentToApply > 0.01) {
                const creditVoucherRef = db.collection("journal-vouchers").doc();
                 transaction.set(creditVoucherRef, {
                    invoiceNumber: await getNextVoucherNumber('RC'), date: new Date().toISOString(), currency: paymentCurrency,
                    notes: `رصيد إضافي بعد سداد كل الأقساط لـ ${subscriptionData.clientName}`, createdBy: user.uid, officer: user.name,
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), voucherType: "journal_from_standard_receipt",
                    debitEntries: [{ accountId: boxId, amount: remainingPaymentToApply, description: 'إيداع رصيد إضافي' }],
                    creditEntries: [{ accountId: subscriptionData.clientId, amount: remainingPaymentToApply, description: 'رصيد إضافي للعميل' }],
                    isAudited: true, isConfirmed: true,
                });
            }
            
             // Re-evaluate subscription status after all updates
            const finalSubscriptionDoc = await transaction.get(subscriptionRef);
            const finalSubscriptionData = finalSubscriptionDoc.data() as Subscription;

            if (finalSubscriptionData.paidAmount >= finalSubscriptionData.salePrice - 0.01) {
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
            
            const reversalJournalRef = db.collection('journal-vouchers').doc();
            const originalJournalDoc = await transaction.get(journalRef);
            if (!originalJournalDoc.exists) throw new Error("Original journal voucher not found.");
            const originalJournal = originalJournalDoc.data() as any;

            transaction.set(reversalJournalRef, {
                invoiceNumber: await getNextVoucherNumber('REV'),
                date: new Date().toISOString(),
                currency: originalJournal.currency,
                notes: `عكس قيد سداد قسط رقم: ${originalJournal.invoiceNumber}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                voucherType: "reversal",
                debitEntries: originalJournal.creditEntries, // Swap debit and credit
                creditEntries: originalJournal.debitEntries,
                isAudited: true, isConfirmed: true,
                originalData: { reversedVoucherId: journalRef.id }
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
                const adjustmentJournalRef = db.collection('journal-vouchers').doc();
                const originalJournalDoc = await transaction.get(originalJournalRef);
                const originalJournal = originalJournalDoc.data() as JournalVoucher;
                const notes = amountDifference > 0 ? `زيادة دفعة قسط: ${oldPayment.id}` : `تخفيض دفعة قسط: ${oldPayment.id}`;
                const debitAccount = amountDifference > 0 ? (originalJournal?.debitEntries[0].accountId) : originalJournal?.creditEntries[0].accountId;
                const creditAccount = amountDifference > 0 ? originalJournal?.creditEntries[0].accountId : (originalJournal?.debitEntries[0].accountId);

                 transaction.set(adjustmentJournalRef, {
                    invoiceNumber: await getNextVoucherNumber('ADJ'),
                    date: newData.date || new Date().toISOString(),
                    currency: oldPayment.currency,
                    notes: notes,
                    createdBy: user.uid, officer: user.name,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    voucherType: "adjustment",
                    debitEntries: [{ accountId: debitAccount!, amount: Math.abs(amountDifference), description: notes }],
                    creditEntries: [{ accountId: creditAccount!, amount: Math.abs(amountDifference), description: notes }],
                    isAudited: true, isConfirmed: true,
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



    