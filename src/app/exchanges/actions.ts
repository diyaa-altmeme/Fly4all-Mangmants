

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Exchange, ExchangeTransaction, ExchangePayment, Currency, Notification } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '../auth/actions';
import { FieldValue } from "firebase-admin/firestore";
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createNotification } from '../notifications/actions';
import type { UnifiedLedgerEntry } from '@/lib/types';

const EXCHANGES_COLLECTION = 'exchanges';

// Helper function to safely convert Firestore Timestamps
const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;

    const safeData = { ...data, id: doc.id };
    for (const key in safeData) {
        if (safeData[key] && typeof safeData[key].toDate === 'function') {
            safeData[key] = safeData[key].toDate().toISOString();
        }
    }
    return safeData;
}


// CRUD for Exchanges
export const getExchanges = cache(async (): Promise<{ accounts?: Exchange[], error?: string }> => {
    const db = await getDb();
    if (!db) return { error: "Database not available." };
    const snapshot = await db.collection(EXCHANGES_COLLECTION).orderBy('name').get();
    const accounts = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        return {
            id: doc.id,
            ...data,
            createdAt: createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Exchange
    });
    return { accounts };
});

export async function addExchange(data: Omit<Exchange, 'id' | 'createdAt'>) {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error("User not authenticated.");

    const docRef = await db.collection(EXCHANGES_COLLECTION).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
    });
    revalidatePath('/exchanges');
    return { success: true, newExchange: { id: docRef.id, ...data, createdAt: new Date().toISOString() } };
}

export async function updateExchange(id: string, data: Partial<Omit<Exchange, 'id' | 'createdAt'>>) {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    await db.collection(EXCHANGES_COLLECTION).doc(id).update(data);
    revalidatePath('/exchanges');
    return { success: true };
}

// CRUD for Transactions
export async function getTransactions(exchangeId: string, from?: Date, to?: Date): Promise<ExchangeTransaction[]> {
    const db = await getDb();
    if (!db) return [];
    let query = db.collection('transactions').where('exchangeId', '==', exchangeId);

    if (from) query = query.where('date', '>=', format(startOfDay(from), 'yyyy-MM-dd'));
    if (to) query = query.where('date', '<=', format(endOfDay(to), 'yyyy-MM-dd'));
    
    query = query.orderBy('date', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        return { 
            id: doc.id, 
            ...data,
            createdAt: createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate().toISOString() : new Date().toISOString(),
        } as ExchangeTransaction
    });
}

const checkThresholdAndNotify = async (exchangeId: string, currentUser: any) => {
    const db = await getDb();
    if (!db) return;
    
    const exchangeDoc = await db.collection(EXCHANGES_COLLECTION).doc(exchangeId).get();
    const exchange = exchangeDoc.data() as Exchange;

    if (!exchange || !exchange.thresholdAlertUSD) return;

    const ledger = await getUnifiedExchangeLedger(exchangeId);
    const currentBalance = ledger.length > 0 ? (ledger[0]?.balance || 0) : 0;
    
    if (Math.abs(currentBalance) > exchange.thresholdAlertUSD) {
        await createNotification({
            userId: currentUser.uid, // Notify the user who made the change
            title: `تنبيه رصيد البورصة: ${exchange.name}`,
            body: `تجاوز رصيد البورصة الحد المحدد. الرصيد الحالي: ${currentBalance.toFixed(2)} USD`,
            type: 'warning',
            link: `/exchanges?exchangeId=${exchangeId}`,
        });
    }
}

export async function saveTransactions(
    exchangeId: string, 
    transactions: Omit<ExchangeTransaction, 'id' | 'createdAt' | 'createdBy' | 'exchangeId' | 'status' | 'linkedPaymentIds' | 'remainingUSD' | 'userName' | 'amountInUSD'>[], 
    batchId?: string
): Promise<{ success: boolean; error?: string; batch?: UnifiedLedgerEntry; }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error("User not authenticated.");
    
    const isEditing = !!batchId;
    
    let originalBatchData: any = {};
    if (isEditing) {
        const oldBatchDoc = await db.collection('exchange_transaction_batches').doc(batchId!).get();
        if(oldBatchDoc.exists) originalBatchData = oldBatchDoc.data();
    }
    
    const batchRef = isEditing ? db.collection('exchange_transaction_batches').doc(batchId!) : db.collection('exchange_transaction_batches').doc();
    const writeBatch = db.batch();


    if (isEditing) {
        const oldTransactionsSnap = await db.collection('transactions').where('batchId', '==', batchId).get();
        oldTransactionsSnap.forEach(doc => writeBatch.delete(doc.ref));
    }

    let totalAmountInUSD = 0;
    
    const savedTransactions: ExchangeTransaction[] = transactions.map(txn => {
        const docRef = db.collection('transactions').doc();
        const rate = Number(txn.rate) || 1;
        const amountInUSD = txn.originalCurrency === 'USD' ? txn.originalAmount : txn.originalAmount / rate;
        
        // All transactions are debt (negative)
        const signedAmountInUSD = -Math.abs(amountInUSD);
        totalAmountInUSD += signedAmountInUSD;
        
        const newTxn: ExchangeTransaction = {
            id: docRef.id,
            ...txn,
            exchangeId,
            batchId: batchRef.id,
            amountInUSD: signedAmountInUSD,
            remainingUSD: Math.abs(signedAmountInUSD),
            status: 'open',
            linkedPaymentIds: [],
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            userName: user.name,
        };

        writeBatch.set(docRef, { ...newTxn, createdAt: FieldValue.serverTimestamp() });
        return newTxn;
    });

    const invoiceNumber = isEditing && originalBatchData.invoiceNumber
        ? originalBatchData.invoiceNumber 
        : await getNextVoucherNumber('EXT');

    const getCreationDate = () => {
        if (!isEditing || !originalBatchData.createdAt) return new Date().toISOString();
        if (typeof originalBatchData.createdAt.toDate === 'function') {
            return originalBatchData.createdAt.toDate().toISOString();
        }
        return new Date(originalBatchData.createdAt).toISOString();
    };
    
    const batchData = {
        exchangeId,
        invoiceNumber: invoiceNumber,
        createdAt: getCreationDate(),
        updatedAt: new Date().toISOString(),
        createdBy: isEditing && originalBatchData.createdBy ? originalBatchData.createdBy : user.uid,
        userName: isEditing && originalBatchData.userName ? originalBatchData.userName : user.name,
        count: transactions.length,
        totalAmount: totalAmountInUSD,
        isConfirmed: originalBatchData.isConfirmed || false,
        date: transactions[0]?.date || new Date().toISOString().slice(0, 10),
    };

    writeBatch.set(batchRef, { ...batchData, updatedAt: FieldValue.serverTimestamp(), createdAt: isEditing ? batchData.createdAt : FieldValue.serverTimestamp() }, { merge: true });

    await writeBatch.commit();
    
    await createNotification({
        userId: user.uid,
        title: 'تم تسجيل دفعة معاملات',
        body: `تم تسجيل ${transactions.length} معاملات جديدة للبورصة بفاتورة ${invoiceNumber}`,
        type: 'voucher',
        link: `/exchanges?exchangeId=${exchangeId}`
    });
    
    // Check threshold after commit
    await checkThresholdAndNotify(exchangeId, user);
    
    revalidatePath('/exchanges');
    
    const newBatch: UnifiedLedgerEntry = {
        id: batchRef.id,
        ...batchData,
        description: '', // Will be generated in getUnifiedExchangeLedger
        entryType: 'transaction',
        details: savedTransactions,
    };
    return { success: true, batch: newBatch };
}


// CRUD for Payments
export async function getPayments(exchangeId: string, from?: Date, to?: Date): Promise<ExchangePayment[]> {
    const db = await getDb();
    if (!db) return [];
    let query = db.collection('payments').where('exchangeId', '==', exchangeId);

    if (from) query = query.where('date', '>=', format(startOfDay(from), 'yyyy-MM-dd'));
    if (to) query = query.where('date', '<=', format(endOfDay(to), 'yyyy-MM-dd'));
    
    query = query.orderBy('date', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        return { 
            id: doc.id, 
            ...data,
            createdAt: createdAt && typeof createdAt.toDate === 'function' ? createdAt.toDate().toISOString() : new Date().toISOString(),
        } as ExchangePayment
    });
}


export async function savePayments(
    exchangeId: string, 
    payments: Omit<ExchangePayment, 'id' | 'createdAt' | 'createdBy' | 'exchangeId' | 'amountInUSD' | 'appliedTxns' | 'userName'>[], 
    batchId?: string
): Promise<{ success: boolean; error?: string; batch?: UnifiedLedgerEntry }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error("User not authenticated.");
    
    const isEditing = !!batchId;

    let originalBatchData: any = {};
    if (isEditing) {
        const oldBatchDoc = await db.collection('exchange_payment_batches').doc(batchId!).get();
        if(oldBatchDoc.exists) originalBatchData = oldBatchDoc.data();
    }
    
    const batchRef = isEditing ? db.collection('exchange_payment_batches').doc(batchId!) : db.collection('exchange_payment_batches').doc();
    const writeBatch = db.batch();

    if (isEditing) {
        const oldPaymentsSnap = await db.collection('payments').where('batchId', '==', batchId).get();
        oldPaymentsSnap.forEach(doc => writeBatch.delete(doc.ref));
    }
    
    let totalAmountInUSD = 0;
    
    const savedPayments: ExchangePayment[] = payments.map((pay: any) => {
        const docRef = db.collection('payments').doc();
        const rate = Number(pay.rate) || 1;
        const amountInUSD = pay.originalCurrency === 'USD' ? pay.originalAmount : pay.originalAmount / rate;
        
        // Payment (to them) is positive, Receipt (from them) is negative
        const signedAmountInUSD = pay.type === 'payment' ? Math.abs(amountInUSD) : -Math.abs(amountInUSD);
        totalAmountInUSD += signedAmountInUSD;

        const newPayment: ExchangePayment = {
            id: docRef.id,
            ...pay,
            exchangeId,
            batchId: batchRef.id,
            amountInUSD: signedAmountInUSD,
            appliedTxns: [],
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            userName: user.name,
        };

        writeBatch.set(docRef, { ...newPayment, createdAt: FieldValue.serverTimestamp() });
        return newPayment;
    });

     const invoiceNumber = isEditing && originalBatchData.invoiceNumber
        ? originalBatchData.invoiceNumber
        : await getNextVoucherNumber('EXP');

     const getCreationDate = () => {
        if (!isEditing || !originalBatchData.createdAt) return new Date().toISOString();
        if (typeof originalBatchData.createdAt.toDate === 'function') {
            return originalBatchData.createdAt.toDate().toISOString();
        }
        return new Date(originalBatchData.createdAt).toISOString();
    };

    const batchData = {
        exchangeId,
        invoiceNumber,
        createdAt: getCreationDate(),
        updatedAt: new Date().toISOString(),
        createdBy: isEditing && originalBatchData.createdBy ? originalBatchData.createdBy : user.uid,
        userName: isEditing && originalBatchData.userName ? originalBatchData.userName : user.name,
        count: payments.length,
        totalAmount: totalAmountInUSD,
        isConfirmed: originalBatchData.isConfirmed || false,
        date: payments[0]?.date || new Date().toISOString().slice(0, 10),
    };

    writeBatch.set(batchRef, { ...batchData, updatedAt: FieldValue.serverTimestamp(), createdAt: isEditing ? batchData.createdAt : FieldValue.serverTimestamp() }, { merge: true });

    await writeBatch.commit();
    
    await createNotification({
        userId: user.uid,
        title: 'تم تسجيل دفعة تسديدات',
        body: `تم تسجيل ${payments.length} تسديدات جديدة للبورصة بفاتورة ${invoiceNumber}`,
        type: 'voucher',
        link: `/exchanges?exchangeId=${exchangeId}`
    });
    
    // Check threshold after commit
    await checkThresholdAndNotify(exchangeId, user);
    
    revalidatePath('/exchanges');

    const newBatch: UnifiedLedgerEntry = {
        id: batchRef.id,
        ...batchData,
        description: '', // Will be generated in getUnifiedExchangeLedger
        entryType: 'payment',
        details: savedPayments,
    };
    return { success: true, batch: newBatch };
}

export const getUnifiedExchangeLedger = cache(async (exchangeId: string, from?: Date, to?: Date): Promise<UnifiedLedgerEntry[]> => {
    if (!exchangeId) return [];

    const db = await getDb();
    if (!db) return [];

    const transactionBatchesQuery = db.collection('exchange_transaction_batches').where('exchangeId', '==', exchangeId);
    const paymentBatchesQuery = db.collection('exchange_payment_batches').where('exchangeId', '==', exchangeId);

    const [transactionBatchesSnap, paymentBatchesSnap] = await Promise.all([
        transactionBatchesQuery.get(),
        paymentBatchesQuery.get()
    ]);

    let allEntries: any[] = [];

    for (const doc of transactionBatchesSnap.docs) {
        const batchData = processDoc(doc);
        const transactionsSnap = await db.collection('transactions').where('batchId', '==', doc.id).get();
        const transactions = transactionsSnap.docs.map(processDoc);
        allEntries.push({ ...batchData, entryType: 'transaction', details: transactions });
    }

    for (const doc of paymentBatchesSnap.docs) {
        const batchData = processDoc(doc);
        const paymentsSnap = await db.collection('payments').where('batchId', '==', doc.id).get();
        const payments = paymentsSnap.docs.map(processDoc);
        allEntries.push({ ...batchData, entryType: 'payment', details: payments });
    }
    
    allEntries.sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
    
    let runningBalance = 0;
    const entriesWithBalanceAndDescription = allEntries.map(entry => {
        const amount = entry.totalAmount || 0;
        runningBalance += amount;

        let description = '';
        if (entry.entryType === 'transaction') {
            const parties = [...new Set(entry.details.map((d: ExchangeTransaction) => d.partyName))];
            const currencySummaries = Object.entries(entry.details.reduce((acc: any, t: ExchangeTransaction) => {
                if (!acc[t.originalCurrency]) acc[t.originalCurrency] = 0;
                acc[t.originalCurrency] += t.originalAmount;
                return acc;
            }, {})).map(([currency, total]: [string, any]) => `إجمالي ${currency}: ${total.toLocaleString()}`).join(' | ');

            description = `معاملات مع: ${parties.join(', ')} | ${currencySummaries}`;
        } else if (entry.entryType === 'payment') {
             description = entry.details.map((p: ExchangePayment) => {
                let baseDesc = `${p.type === 'payment' ? 'دفع إلى' : 'قبض من'} ${p.paidTo}`;
                if (p.intermediary) baseDesc += ` بواسطة ${p.intermediary}`;
                baseDesc += `: ${p.originalAmount.toLocaleString()} ${p.originalCurrency}`;
                if (p.note) baseDesc += ` (${p.note})`;
                return baseDesc;
            }).join(' | ');
        }

        return { ...entry, balance: runningBalance, description };
    });
    
    const finalEntries = entriesWithBalanceAndDescription.reverse();

    if (from && to) {
        const interval = { start: startOfDay(from), end: endOfDay(to) };
        return finalEntries.filter(entry => isWithinInterval(parseISO(entry.date), interval)) as UnifiedLedgerEntry[];
    }

    return finalEntries as UnifiedLedgerEntry[];
});


export async function updateBatch(batchId: string, batchType: 'transaction' | 'payment', data: { date?: string; description?: string, isConfirmed?: boolean }) {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    
    const collectionName = batchType === 'transaction' ? 'exchange_transaction_batches' : 'exchange_payment_batches';
    const batchRef = db.collection(collectionName).doc(batchId);

    try {
        await batchRef.update(data);
        revalidatePath('/exchanges');
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteExchangeTransactionBatch(batchId: string): Promise<{ success: boolean; error?: string, deletedId?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const batchRef = db.collection('exchange_transaction_batches').doc(batchId);
        const batchDoc = await batchRef.get();
        if (!batchDoc.exists) {
            throw new Error("Batch not found.");
        }
        
        const writeBatch = db.batch();
        const oldTransactionsSnap = await db.collection('transactions').where('batchId', '==', batchId).get();
        oldTransactionsSnap.forEach(doc => writeBatch.delete(doc.ref));

        writeBatch.delete(batchRef);

        await writeBatch.commit();
        revalidatePath('/exchanges');
        return { success: true, deletedId: batchId };
    } catch (e: any) {
        console.error("Error deleting transaction batch:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteExchangePaymentBatch(batchId: string): Promise<{ success: boolean; error?: string, deletedId?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const batchRef = db.collection('exchange_payment_batches').doc(batchId);
        const batchDoc = await batchRef.get();
        if (!batchDoc.exists) {
            throw new Error("Batch not found.");
        }
        
        const writeBatch = db.batch();
        const oldPaymentsSnap = await db.collection('payments').where('batchId', '==', batchId).get();
        oldPaymentsSnap.forEach(doc => writeBatch.delete(doc.ref));

        writeBatch.delete(batchRef);

        await writeBatch.commit();
        revalidatePath('/exchanges');
        return { success: true, deletedId: batchId };
    } catch (e: any) {
        console.error("Error deleting payment batch:", e);
        return { success: false, error: e.message };
    }
}


export interface ExchangeDashboardData extends Exchange {
  balance: number;
  lastTransactions: UnifiedLedgerEntry[];
}

export const getExchangesDashboardData = async (): Promise<ExchangeDashboardData[]> => {
    const db = await getDb();
    if (!db) return [];
    
    const exchangesResult = await getExchanges();
    if (!exchangesResult.accounts) return [];

    const dashboardDataPromises = exchangesResult.accounts.map(async (exchange) => {
        const ledgerData = await getUnifiedExchangeLedger(exchange.id);
        const latestEntries = ledgerData.slice(0, 3);
        const currentBalance = ledgerData.length > 0 ? (ledgerData[0]?.balance || 0) : 0;
        
        return {
            ...exchange,
            balance: currentBalance,
            lastTransactions: latestEntries,
        };
    });

    return Promise.all(dashboardDataPromises);
}

    