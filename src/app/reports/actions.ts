
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher } from "@/lib/types";

export async function getAccountStatement(filters: any) {
  const db = await getDb();
  const { accountId, dateFrom, dateTo, voucherType } = filters;
  const vouchersRef = db.collection("journal-vouchers");

  // ترتيب واستعلام التاريخ
  let query = vouchersRef.orderBy("date", "asc");
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
    debitEntries.forEach((entry) => {
      if (entry.accountId !== accountId) return;
      rows.push({
        id: `${doc.id}_debit_${entry.accountId}`,
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
        sourceType: v.sourceType || "",
        sourceId: v.sourceId || "",
        sourceRoute: v.sourceRoute || "",
      });
    });

    creditEntries.forEach((entry) => {
      if (entry.accountId !== accountId) return;
      rows.push({
        id: `${doc.id}_credit_${entry.accountId}`,
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
        sourceType: v.sourceType || "",
        sourceId: v.sourceId || "",
        sourceRoute: v.sourceRoute || "",
      });
    });
  });

  // فلترة نوع العملية (اختياري)
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
