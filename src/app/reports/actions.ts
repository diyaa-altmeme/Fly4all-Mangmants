
'use server';

import { getDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { JournalVoucher, DebtsReportData, DebtsReportEntry, Client, JournalEntry, ReportTransaction } from "@/lib/types";
import { getClients } from '@/app/relations/actions';
import { parseISO } from "date-fns";

// 🔹 جلب كشف الحساب مع معالجة الحقول الجديدة وحساب أرصدة منفصلة لكل عملة
export async function getAccountStatement(filters: { accountId: string; dateFrom?: Date; dateTo?: Date; voucherType?: string[] }) {
  const db = await getDb();
  if (!db) {
      console.error("Database not available");
      return [];
  }
  const { accountId, dateFrom, dateTo, voucherType } = filters;

  try {
    // ترتيب واستعلام التاريخ
    let query: FirebaseFirestore.Query = db.collection("journal-vouchers");
    
    if (dateFrom) query = query.where("date", ">=", dateFrom.toISOString());
    if (dateTo) query = query.where("date", "<=", dateTo.toISOString());
    
    query = query.orderBy("date", "asc");

    const snapshot = await query.get();
    const rows: any[] = [];

    snapshot.forEach((doc) => {
        const v = doc.data() as JournalVoucher;

        if (v.isDeleted) return;

        const debitEntries = v.debitEntries || [];
        const creditEntries = v.creditEntries || [];
        
        const hasDebit = debitEntries.some(e => e.accountId === accountId);
        const hasCredit = creditEntries.some(e => e.accountId === accountId);

        if (!hasDebit && !hasCredit) return;

        debitEntries.forEach((entry, index) => {
            if (entry.accountId !== accountId) return;
            rows.push({
                id: `${doc.id}_debit_${index}`,
                date: v.date,
                invoiceNumber: v.invoiceNumber,
                description: entry.description || v.notes || v.originalData?.details || v.originalData?.description || "",
                debit: Number(entry.amount) || 0,
                credit: 0,
                balanceUSD: 0, 
                balanceIQD: 0,
                currency: v.currency || 'USD',
                officer: v.officer || '',
                voucherType: v.voucherType,
                sourceType: v.originalData?.sourceType || v.voucherType,
                sourceId: v.originalData?.sourceId || doc.id,
                sourceRoute: v.originalData?.sourceRoute,
                originalData: v.originalData,
            });
        });

        creditEntries.forEach((entry, index) => {
            if (entry.accountId !== accountId) return;
            rows.push({
                id: `${doc.id}_credit_${index}`,
                date: v.date,
                invoiceNumber: v.invoiceNumber,
                description: entry.description || v.notes || v.originalData?.details || v.originalData?.description || "",
                debit: 0,
                credit: Number(entry.amount) || 0,
                balanceUSD: 0,
                balanceIQD: 0,
                currency: v.currency || 'USD',
                officer: v.officer || '',
                voucherType: v.voucherType,
                sourceType: v.originalData?.sourceType || v.voucherType,
                sourceId: v.originalData?.sourceId || doc.id,
                sourceRoute: v.originalData?.sourceRoute,
                originalData: v.originalData,
            });
        });
    });

    const filteredRows = voucherType && voucherType.length > 0
        ? rows.filter(r => (r.voucherType && voucherType.includes(r.voucherType)) || (r.sourceType && voucherType.includes(r.sourceType)))
        : rows;
        

    let balanceUSD = 0;
    let balanceIQD = 0;
    const result = filteredRows
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r: any) => {
            if (r.currency === 'USD') {
                balanceUSD += (r.debit || 0) - (r.credit || 0);
            } else if (r.currency === 'IQD') {
                balanceIQD += (r.debit || 0) - (r.credit || 0);
            }
            return { ...r, balanceUSD, balanceIQD };
        });

    return result;
  } catch (err: any) {
    console.error('❌ Error loading account statement:', err);
    return [];
  }
}

export async function getClientTransactions(clientId: string) {
    const { transactions } = await getAccountStatement({ accountId: clientId });
    return { transactions: transactions.map(tx => ({...tx, id: tx.id || tx.invoiceNumber})) };
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
        return new Date(dateA).getTime() - new Date(dateB).getTime();
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
        phone: client.phone,
        accountType: client.relationType,
        balanceUSD: balances[client.id]?.balanceUSD || 0,
        balanceIQD: balances[client.id]?.balanceIQD || 0,
        lastTransaction: balances[client.id]?.lastTransaction || null,
    }));
    
    const summary = entries.reduce((acc, entry) => {
        const balanceUSD = entry.balanceUSD || 0;
        const balanceIQD = entry.balanceIQD || 0;
        
        // A client debit means they owe us, a credit means we owe them.
        // A supplier debit means we owe them less, a credit means we owe them more.
        if (entry.accountType === 'client' || entry.accountType === 'both') {
            if (balanceUSD > 0) acc.totalDebitUSD += balanceUSD; else acc.totalCreditUSD -= balanceUSD;
            if (balanceIQD > 0) acc.totalDebitIQD += balanceIQD; else acc.totalCreditIQD -= balanceIQD;
        } else { // Supplier
            if (balanceUSD < 0) acc.totalDebitUSD -= balanceUSD; else acc.totalCreditUSD += balanceUSD;
            if (balanceIQD < 0) acc.totalDebitIQD -= balanceIQD; else acc.totalCreditIQD += balanceIQD;
        }
        
        return acc;
    }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });

    return {
        entries,
        summary: {
            ...summary,
            balanceUSD: summary.totalDebitUSD - summary.totalCreditUSD,
            balanceIQD: summary.totalDebitIQD - summary.totalCreditIQD,
        }
    };
}
