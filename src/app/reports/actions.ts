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
    
    // This is less efficient but necessary for OR queries on different fields.
    // Firestore requires an index for this. A better approach for large datasets would be a dedicated search service
    // or restructuring data. For now, we fetch then filter.
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
        ? rows.filter(r => voucherType.includes(r.voucherType) || voucherType.includes(r.sourceType))
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
