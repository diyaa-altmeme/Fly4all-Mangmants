
'use server';

import { getDb } from "@/lib/firebase-admin";
import { Timestamp, FieldPath } from "firebase-admin/firestore";
import type { JournalVoucher, DebtsReportData, DebtsReportEntry, Client, JournalEntry, ReportTransaction, BookingEntry, VisaBookingEntry, Subscription, ReportInfo, Currency } from '@/lib/types';
import { getClients } from '@/app/relations/actions';
import { parseISO } from "date-fns";

// 🔹 جلب كشف الحساب مع معالجة الحقول الجديدة وحساب أرصدة منفصلة لكل عملة
export async function getAccountStatement(filters: { accountId: string; dateFrom?: Date; dateTo?: Date; voucherType?: string[] }) {
  const db = await getDb();
  if (!db) {
      console.error("Database not available");
      throw new Error("Database connection is not available.");
  }
  const { accountId, dateFrom, dateTo, voucherType } = filters;

  try {
    let rows: any[] = [];
    
    let debitQuery: FirebaseFirestore.Query = db.collection("journal-vouchers");
    let creditQuery: FirebaseFirestore.Query = db.collection("journal-vouchers");

    if (dateFrom) {
      debitQuery = debitQuery.where("date", ">=", dateFrom.toISOString());
      creditQuery = creditQuery.where("date", ">=", dateFrom.toISOString());
    }
    if (dateTo) {
      debitQuery = debitQuery.where("date", "<=", dateTo.toISOString());
      creditQuery = creditQuery.where("date", "<=", dateTo.toISOString());
    }
    
    debitQuery = debitQuery.where('debitEntries', 'array-contains', { accountId });
    creditQuery = creditQuery.where('creditEntries', 'array-contains', { accountId });
    
    const [debitSnapshot, creditSnapshot] = await Promise.all([
      debitQuery.orderBy('date', 'asc').get(),
      creditQuery.orderBy('date', 'asc').get()
    ]);
    
    const processedIds = new Set<string>();

    const processSnapshot = (snapshot: FirebaseFirestore.QuerySnapshot) => {
        snapshot.forEach((doc) => {
            if (processedIds.has(doc.id)) return;
            
            const v = doc.data() as JournalVoucher;
            if (v.isDeleted) return;

            let isRelevant = false;
            
            v.debitEntries?.forEach((entry, index) => {
                if (entry.accountId === accountId) {
                    isRelevant = true;
                    rows.push({
                        id: `${doc.id}_debit_${index}`, date: v.date, invoiceNumber: v.invoiceNumber,
                        description: entry.description || v.notes,
                        debit: Number(entry.amount) || 0, credit: 0,
                        currency: v.currency || 'USD', officer: v.officer, voucherType: v.voucherType,
                        sourceType: v.originalData?.sourceType || v.voucherType, sourceId: v.originalData?.sourceId || doc.id, sourceRoute: v.originalData?.sourceRoute, originalData: v.originalData,
                    });
                }
            });
            v.creditEntries?.forEach((entry, index) => {
                if (entry.accountId === accountId) {
                    isRelevant = true;
                    rows.push({
                        id: `${doc.id}_credit_${index}`, date: v.date, invoiceNumber: v.invoiceNumber,
                        description: entry.description || v.notes,
                        debit: 0, credit: Number(entry.amount) || 0,
                        currency: v.currency || 'USD', officer: v.officer, voucherType: v.voucherType,
                        sourceType: v.originalData?.sourceType || v.voucherType, sourceId: v.originalData?.sourceId || doc.id, sourceRoute: v.originalData?.sourceRoute, originalData: v.originalData,
                    });
                }
            });

            if(isRelevant) processedIds.add(doc.id);
        });
    }

    processSnapshot(debitSnapshot);
    processSnapshot(creditSnapshot);


    const filteredRows = voucherType && voucherType.length > 0
        ? rows.filter(r => (r.voucherType && voucherType.includes(r.voucherType)) || (r.sourceType && voucherType.includes(r.sourceType)))
        : rows;
        

    let balanceUSD = 0;
    let balanceIQD = 0;
    const result = filteredRows
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
    console.error('❌ Error loading account statement:', err.message);
    if (err.code === 9 || (err.message && err.message.includes('requires an index'))) { 
      const urlMatch = err.message.match(/(https?:\/\/[^\s)\]]+)/);
      const indexUrl = urlMatch ? urlMatch[0] : null;
      let userMessage = `فشل تحميل كشف الحساب: يتطلب الاستعلام فهرسًا مركبًا في Firestore.`;
      
      if (indexUrl) {
        // Special prefix to be caught by the frontend
        throw new Error(`FIRESTORE_INDEX_URL::${indexUrl}`);
      } else {
        userMessage += ` يرجى مراجعة سجلات الخادم للحصول على الرابط وإنشاء الفهرس المطلوب.`;
      }
      throw new Error(userMessage);
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
