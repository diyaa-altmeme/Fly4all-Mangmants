
"use server";

import { getDb } from "@/lib/firebase-admin";
import type { JournalVoucher } from "@/lib/types";

export async function getAccountStatement(filters: any) {
  const db = getDb();
  const { accountId, dateFrom, dateTo, voucherType } = filters;
  const vouchersRef = db.collection("journal-vouchers");

  // جلب كل السندات ضمن الفترة الزمنية فقط
  let query: FirebaseFirestore.Query = vouchersRef.orderBy("date", "asc");
  if (dateFrom) query = query.where("date", ">=", dateFrom);
  if (dateTo) query = query.where("date", "<=", dateTo);

  const snapshot = await query.get();
  const rows: any[] = [];

  snapshot.forEach((doc) => {
    const v = doc.data() as JournalVoucher;

    // تجاهل السجلات المحذوفة أو غير المؤكدة
    if (v.isDeleted) return;

    const debitEntries = v.debitEntries || [];
    const creditEntries = v.creditEntries || [];

    // معالجة كل حركة فرعية داخل السند
    debitEntries.forEach((entry, index) => {
      if (entry.accountId !== accountId) return;
      rows.push({
        id: `${doc.id}_debit_${index}`, // Unique ID for each sub-entry
        date: v.date,
        invoiceNumber: v.invoiceNumber,
        description:
          entry.description ||
          v.notes ||
          v.originalData?.details ||
          "",
        debit: Number(entry.amount) || 0,
        credit: 0,
        currency: v.currency || "USD",
        officer: v.officer || "",
        voucherType: v.voucherType || "",
        sourceType: v.sourceType || v.voucherType, // Fallback to voucherType if sourceType is missing
        sourceId: v.sourceId || doc.id, // Fallback to doc.id
        sourceRoute: v.sourceRoute || null,
        notes: v.notes,
        originalData: v.originalData,
      });
    });

    creditEntries.forEach((entry, index) => {
      if (entry.accountId !== accountId) return;
      rows.push({
        id: `${doc.id}_credit_${index}`, // Unique ID for each sub-entry
        date: v.date,
        invoiceNumber: v.invoiceNumber,
        description:
          entry.description ||
          v.notes ||
          v.originalData?.details ||
          "",
        debit: 0,
        credit: Number(entry.amount) || 0,
        currency: v.currency || "USD",
        officer: v.officer || "",
        voucherType: v.voucherType || "",
        sourceType: v.sourceType || v.voucherType, // Fallback
        sourceId: v.sourceId || doc.id, // Fallback
        sourceRoute: v.sourceRoute || null,
        notes: v.notes,
        originalData: v.originalData,
      });
    });
  });

  // فلترة حسب نوع العملية إذا المستخدم اختار فلتر محدد
  const filteredRows = voucherType
    ? rows.filter(
        (r) => r.voucherType === voucherType || r.sourceType === voucherType
      )
    : rows;

  // ترتيب زمني + احتساب الرصيد التراكمي
  let balance = 0;
  const result = filteredRows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      balance += (r.debit || 0) - (r.credit || 0);
      return { ...r, balance };
    });

  return result;
}
