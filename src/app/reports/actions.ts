

'use server';

import { getDb } from '@/lib/firebase-admin';
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
    const users = await getUsers();
    const usersMap = new Map(users.map(u => [u.uid, u.name]));
    
    const allVouchersSnap = await db.collection('journal-vouchers').orderBy('date', 'asc').get();

    const openingBalances: Record<string, number> = {};
    const reportRows: any[] = [];

    allVouchersSnap.forEach(doc => {
        const v = doc.data() as JournalVoucher;
        if (v.isDeleted) return;

        const voucherDate = normalizeToDate(v.date) ?? normalizeToDate(v.createdAt) ?? new Date();

        const processEntry = (entry: JournalEntry, type: 'debit' | 'credit') => {
            if (entry.accountId === accountId) {
                const amount = (type === 'debit' ? 1 : -1) * (entry.amount || 0);
                const currency = v.currency || 'USD';

                if (dateFrom && voucherDate < dateFrom) {
                    openingBalances[currency] = (openingBalances[currency] || 0) + amount;
                } else if ((!dateFrom || voucherDate >= dateFrom) && (!dateTo || voucherDate <= dateTo)) {
                    
                    const entryNote = typeof (entry as any).note === 'string' ? (entry as any).note.trim() : '';
                    const voucherNote = typeof v.notes === 'string' ? v.notes.trim() : '';

                    reportRows.push({
                        id: `${doc.id}_${type}_${Math.random()}`,
                        date: voucherDate.toISOString(),
                        invoiceNumber: v.invoiceNumber,
                        description: entry.description || v.notes || '',
                        debit: type === 'debit' ? entry.amount || 0 : 0,
                        credit: type === 'credit' ? entry.amount || 0 : 0,
                        currency: currency,
                        officer: usersMap.get(v.createdBy) || v.officer || v.createdBy,
                        voucherType: v.voucherType,
                        sourceType: v.originalData?.sourceType || v.voucherType,
                        sourceId: v.originalData?.sourceId || doc.id,
                        sourceRoute: v.originalData?.sourceRoute,
                        originalData: v.originalData,
                        notes: entryNote || voucherNote,
                        direction: type,
                        amount: entry.amount || 0,
                        type: v.voucherType,
                        accountId: entry.accountId,
                        createdAt: serializeDate(v.createdAt),
                    });
                }
            }
        };

        (v.debitEntries || []).forEach(entry => processEntry(entry, 'debit'));
        (v.creditEntries || []).forEach(entry => processEntry(entry, 'credit'));
    });

    const filteredRows = voucherType && voucherType.length > 0
        ? reportRows.filter(r => (r.voucherType && voucherType.includes(r.voucherType)) || (r.sourceType && voucherType.includes(r.sourceType)))
        : reportRows;

    const runningBalances: Record<string, number> = { ...openingBalances };
    
    const result = filteredRows
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((r: any) => {
            const currency = r.currency || 'USD';
            const previousBalance = runningBalances[currency] ?? 0;
            const nextBalance = previousBalance + (r.debit || 0) - (r.credit || 0);
            runningBalances[currency] = nextBalance;

            const balancesSnapshot = { ...runningBalances };

            return {
                ...r,
                balance: nextBalance, // For single currency context
                balancesByCurrency: balancesSnapshot, // For multi-currency context
                balanceUSD: balancesSnapshot['USD'] ?? 0,
                balanceIQD: balancesSnapshot['IQD'] ?? 0,
            };
        });

    return { transactions: result, openingBalances };

  } catch (err: any) {
    console.error('❌ Error loading account statement:', err.message);
    if (err.code === 9 || err.code === 'FAILED_PRECONDITION' || (err.message && err.message.includes('requires an index'))) { 
      const urlMatch = err.message.match(/(https?:\/\/[^\s)\]]+)/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      
      const userMessage = `فشل تحميل كشف الحساب: يتطلب الاستعلام فهرسًا مركبًا في Firestore.`;
      
      if (indexUrl) {
        throw new Error(`FIRESTORE_INDEX_URL::${indexUrl}`);
      } else {
         throw new Error(`${userMessage} يرجى مراجعة سجلات الخادم للحصول على الرابط وإنشاء الفهرس المطلوب.`);
      }
    }
    throw new Error(`فشل تحميل كشف الحساب: ${err.message}`);
  }
}

export async function getClientTransactions(clientId: string) {
    const { transactions, openingBalances } = await getAccountStatement({ accountId: clientId });
    
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
            (entries || []).forEach(entry => {
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
