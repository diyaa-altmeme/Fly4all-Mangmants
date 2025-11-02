
'use server';

import { getDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { JournalVoucher, DebtsReportData, DebtsReportEntry, Client, JournalEntry, ReportTransaction, BookingEntry, VisaBookingEntry, Subscription, ReportInfo, Currency } from '@/lib/types';
import { getClients } from '@/app/relations/actions';
import { getUsers } from "../users/actions";

// 🔹 جلب كشف الحساب مع معالجة الحقول الجديدة وحساب أرصدة منفصلة لكل عملة
const normalizeToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const date = (value as any).toDate();
    return date instanceof Date ? date : null;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as any).seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  return null;
};

const serializeDate = (value: unknown): string => {
  const asDate = normalizeToDate(value);
  return (asDate ?? new Date()).toISOString();
};

export async function getAccountStatement(filters: { accountId: string; dateFrom?: Date; dateTo?: Date; voucherType?: string[] }) {
  const db = await getDb();
  if (!db) {
      console.error("Database not available");
      throw new Error("Database connection is not available.");
  }
  const { accountId, dateFrom, dateTo, voucherType } = filters;

  try {
    let rows: any[] = [];
    
    // Fetch users to map createdBy UID to name
    const users = await getUsers();
    const usersMap = new Map(users.map(u => [u.uid, u.name]));
    
    rows = []; // Reset rows
    
    const allVouchersSnap = await db.collection('journal-vouchers').orderBy('date', 'asc').get();

    allVouchersSnap.forEach(doc => {
        const v = doc.data() as JournalVoucher;

        if (v.isDeleted) return;

        const voucherDate = normalizeToDate(v.date) ?? normalizeToDate(v.createdAt) ?? null;
        if (dateFrom && voucherDate && voucherDate < dateFrom) return;
        if (dateTo && voucherDate && voucherDate > dateTo) return;

        const isoDate = voucherDate ? voucherDate.toISOString() : serializeDate(v.date);

        const isRelevant = v.debitEntries?.some(e => e.accountId === accountId) || v.creditEntries?.some(e => e.accountId === accountId);

        if (isRelevant) {
            v.debitEntries?.forEach((entry, index) => {
                if (entry.accountId === accountId) {
                    let description = entry.description || v.notes;
                    // FIX: Modify segment description
                    if (v.sourceType === 'segment' && description.startsWith('إيراد سكمنت من')) {
                        const parts = description.split(' للفترة من ');
                        if (parts.length > 1) {
                            description = `سكمنت للفترة من ${parts[1]}`;
                        }
                    }

                    const entryNote = typeof entry.note === 'string' ? entry.note.trim() : '';
                    const voucherNote = typeof v.notes === 'string' ? v.notes.trim() : '';

                    rows.push({
                        id: `${doc.id}_debit_${index}`,
                        date: isoDate,
                        invoiceNumber: v.invoiceNumber,
                        description: description,
                        debit: Number(entry.amount ?? entry.debit) || 0,
                        credit: 0,
                        currency: v.currency || 'USD',
                        officer: usersMap.get(v.createdBy) || v.officer || v.createdBy, // Use map to get name
                        voucherType: v.voucherType,
                        sourceType: v.originalData?.sourceType || v.voucherType, sourceId: v.originalData?.sourceId || doc.id, sourceRoute: v.originalData?.sourceRoute, originalData: v.originalData,
                        notes: entryNote,
                        entryNote,
                        voucherNote,
                        direction: 'debit',
                        amount: Number(entry.amount ?? entry.debit) || 0,
                        type: v.voucherType,
                        accountId: entry.accountId,
                        accountName: entry.accountName,
                        createdAt: serializeDate(v.createdAt),
                    });
                }
            });
            v.creditEntries?.forEach((entry, index) => {
                if (entry.accountId === accountId) {
                     let description = entry.description || v.notes;
                     // FIX: Modify segment description
                     if (v.sourceType === 'segment' && description.startsWith('إيراد سكمنت من')) {
                        const parts = description.split(' للفترة من ');
                        if (parts.length > 1) {
                            description = `سكمنت للفترة من ${parts[1]}`;
                        }
                    }

                    const entryNote = typeof entry.note === 'string' ? entry.note.trim() : '';
                    const voucherNote = typeof v.notes === 'string' ? v.notes.trim() : '';

                     rows.push({
                        id: `${doc.id}_credit_${index}`,
                        date: isoDate,
                        invoiceNumber: v.invoiceNumber,
                        description: description,
                        debit: 0,
                        credit: Number(entry.amount ?? entry.credit) || 0,
                        currency: v.currency || 'USD',
                        officer: usersMap.get(v.createdBy) || v.officer || v.createdBy, // Use map to get name
                        voucherType: v.voucherType,
                        sourceType: v.originalData?.sourceType || v.voucherType, sourceId: v.originalData?.sourceId || doc.id, sourceRoute: v.originalData?.sourceRoute, originalData: v.originalData,
                        notes: entryNote,
                        entryNote,
                        voucherNote,
                        direction: 'credit',
                        amount: Number(entry.amount ?? entry.credit) || 0,
                        type: v.voucherType,
                        accountId: entry.accountId,
                        accountName: entry.accountName,
                        createdAt: serializeDate(v.createdAt),
                    });
                }
            });
        }
    });

    const filteredRows = voucherType && voucherType.length > 0
        ? rows.filter(r => (r.voucherType && voucherType.includes(r.voucherType)) || (r.sourceType && voucherType.includes(r.sourceType)))
        : rows;


    const runningBalances = new Map<string, number>();
    const result = filteredRows
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r: any) => {
            const currency = r.currency || 'USD';
            const previousBalance = runningBalances.get(currency) ?? 0;
            const nextBalance = previousBalance + (r.debit || 0) - (r.credit || 0);
            runningBalances.set(currency, nextBalance);

            const balancesSnapshot = Object.fromEntries(Array.from(runningBalances.entries()));

            return {
                ...r,
                balance: nextBalance,
                balancesByCurrency: balancesSnapshot,
                balanceUSD: balancesSnapshot['USD'] ?? 0,
                balanceIQD: balancesSnapshot['IQD'] ?? 0,
            };
        });

    return result;
  } catch (err: any) {
    console.error('❌ Error loading account statement:', err.message);
    if (err.code === 9 || err.code === 'FAILED_PRECONDITION' || (err.message && err.message.includes('requires an index'))) { 
      const urlMatch = err.message.match(/(https?:\/\/[^\s)\]]+)/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      const userMessage = `فشل تحميل كشف الحساب: يتطلب الاستعلام فهرسًا مركبًا في Firestore.`;
      
      if (indexUrl) {
        // Special prefix to be caught by the frontend
        throw new Error(`FIRESTORE_INDEX_URL::${indexUrl}`);
      } else {
         throw new Error(`${userMessage} يرجى مراجعة سجلات الخادم للحصول على الرابط وإنشاء الفهرس المطلوب.`);
      }
    }
    throw new Error(`فشل تحميل كشف الحساب: ${err.message}`);
  }
}

export async function getClientTransactions(clientId: string) {
    const transactions = await getAccountStatement({ accountId: clientId });
    const allRelations = await getClients({all: true});
    
    let totalSales = 0;
    let paidAmount = 0;
    let totalProfit = 0;

    transactions.forEach(tx => {
        if(tx.sourceType === 'booking' || tx.sourceType === 'visa' || tx.sourceType === 'subscription') {
             totalSales += tx.debit;
             if (tx.originalData) {
                 const sale = tx.originalData.salePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.salePrice || 0), 0);
                 const purchase = tx.originalData.purchasePrice || (tx.originalData.passengers || []).reduce((acc: number, p: any) => acc + (p.purchasePrice || 0), 0);
                 totalProfit += sale - purchase;
             }
        } else if (tx.sourceType === 'standard_receipt' || tx.sourceType === 'payment') {
            paidAmount += tx.credit;
        }
    });

    const dueAmount = totalSales - paidAmount;

    return { 
        transactions: transactions.map(tx => ({...tx, id: tx.id || tx.invoiceNumber})),
        totalSales,
        paidAmount,
        dueAmount,
        totalProfit,
        currency: 'USD' as Currency,
    };
}


export async function getDebtsReportData(): Promise<DebtsReportData> {
    const db = await getDb();
    if (!db) return { entries: [], summary: { totalDebitUSD: 0, totalCreditUSD: 0, balanceUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0, balanceIQD: 0 } };

    const { clients } = await getClients({ all: true, includeInactive: false });
    const vouchersSnap = await db.collection("journal-vouchers").get();

    const balances: Record<string, { balanceUSD: number; balanceIQD: number; lastTransaction: string | null }> = {};

    clients.forEach(client => {
        balances[client.id] = { balanceUSD: 0, balanceIQD: 0, lastTransaction: null };
    });
    
    const sortedVouchers = vouchersSnap.docs.sort((a, b) => {
        const dateA = a.data().date;
        const dateB = b.data().date;
        return new Date(dateA).getTime() - new Date(b.date).getTime();
    });

    sortedVouchers.forEach(doc => {
        const v = doc.data() as JournalVoucher;
        if(v.isDeleted) return;

        const processEntries = (entries: JournalEntry[], isDebit: boolean) => {
            entries.forEach(entry => {
                if (balances[entry.accountId]) {
                    const amount = isDebit ? entry.amount : -entry.amount;
                    if (v.currency === 'USD') {
                        balances[entry.accountId].balanceUSD += amount;
                    } else if (v.currency === 'IQD') {
                        balances[entry.accountId].balanceIQD += amount;
                    }

                    if (!balances[entry.accountId].lastTransaction || v.date > balances[entry.accountId].lastTransaction!) {
                        balances[entry.accountId].lastTransaction = v.date;
                    }
                }
            });
        };

        processEntries(v.debitEntries || [], true);
        processEntries(v.creditEntries || [], false);
    });

    const entries = clients.map((client: Client): DebtsReportEntry => ({
        id: client.id,
        name: client.name,
        code: client.code,
        phone: client.phone,
        accountType: client.relationType,
        balanceUSD: balances[client.id]?.balanceUSD || 0,
        balanceIQD: balances[client.id]?.balanceIQD || 0,
        lastTransaction: balances[client.id]?.lastTransaction || null,
    }));
    
    const summary = entries.reduce((acc, entry) => {
        const balanceUSD = entry.balanceUSD || 0;
        const balanceIQD = entry.balanceIQD || 0;
        
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceUSD > 0) acc.totalCreditUSD += balanceUSD; else acc.totalDebitUSD -= balanceUSD;
        } else { // Supplier
            if (balanceUSD < 0) acc.totalCreditUSD -= balanceUSD; else acc.totalDebitUSD += balanceUSD;
        }
         if ((entry.accountType === 'client' || entry.accountType === 'both')) {
            if (balanceIQD > 0) acc.totalCreditIQD += balanceIQD; else acc.totalDebitIQD -= balanceIQD;
        } else { // Supplier
            if (balanceIQD < 0) acc.totalCreditIQD -= balanceIQD; else acc.totalDebitIQD += balanceIQD;
        }
        
        return acc;
    }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });

    return {
        entries,
        summary: {
            ...summary,
            balanceUSD: summary.totalCreditUSD - summary.totalDebitUSD,
            balanceIQD: summary.totalCreditIQD - summary.totalDebitIQD,
        }
    };
}
