
'use server';

import { getDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { JournalVoucher } from "@/lib/types";

// 🔹 جلب كشف الحساب مع معالجة الحقول الجديدة
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
    
    // We cannot order by date and filter by accountId with 'in' or 'array-contains' at the same time
    // without a composite index. So we fetch by date and filter in memory.
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
                balance: 0, 
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
                balance: 0,
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
        

    let balance = 0;
    const result = filteredRows
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r: any) => {
            balance += (r.debit || 0) - (r.credit || 0);
            return { ...r, balance };
        });

    return result;
  } catch (err: any) {
    console.error('❌ Error loading account statement:', err);
    return [];
  }
}
