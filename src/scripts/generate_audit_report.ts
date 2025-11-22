

/**
 * سكربت توليد تقرير التدقيق المالي الكامل
 * ----------------------------------------------
 * الغرض: إنشاء تقرير Excel يحتوي على جميع القيود المالية،
 *         وفحص التوازن وحفظه في مجلد عام للتحميل.
 */

import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

async function generateAuditReport() {
  const db = await getDb();
  console.log("📊 بدء إنشاء تقرير التدقيق المالي...");

  const snapshot = await db.collection("journal-vouchers").get();
  console.log(`📁 تم العثور على ${snapshot.size} قيد محاسبي.`);

  if (snapshot.empty) {
    console.log("⚠️ لا توجد قيود لإنشاء تقرير منها.");
    return;
  }

  const rows: any[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const debitEntries = data.debitEntries || [];
    const creditEntries = data.creditEntries || [];

    const totalDebits = debitEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalCredits = creditEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const debitAccounts = debitEntries.map(e => e.accountId).join(', ');
    const creditAccounts = creditEntries.map(e => e.accountId).join(', ');

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;
    const status = isBalanced ? "✅ متوازن" : "⚠️ غير متوازن";
    const notes = isBalanced
      ? "القيد سليم"
      : `فرق قدره ${(totalDebits - totalCredits).toFixed(2)}`;

    let createdAt = data.createdAt;
    if (createdAt && typeof createdAt.toDate === 'function') {
      createdAt = createdAt.toDate().toISOString();
    }

    rows.push({
      'رقم القيد': doc.id,
      'نوع العملية': data.sourceType || 'غير محدد',
      'معرّف المصدر': data.sourceId || '',
      'إجمالي المدين': totalDebits,
      'إجمالي الدائن': totalCredits,
      'العملة': data.currency || 'USD',
      'الحسابات المدينة': debitAccounts || 'غير معروف',
      'الحسابات الدائنة': creditAccounts || 'غير معروف',
      'الحالة': status,
      'الملاحظات': notes,
      'تاريخ الإنشاء': createdAt || '',
      'تم الإنشاء بواسطة': data.createdBy || '',
    });
  }

  // تغيير المسار إلى public/reports
  const reportPath = path.join(process.cwd(), "public", "reports");
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const fileName = `audit-report-${new Date().toISOString().split("T")[0]}.xlsx`;
  const fullPath = path.join(reportPath, fileName);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Report");

  XLSX.writeFile(workbook, fullPath);

  const publicUrl = `/reports/${fileName}`;
  console.log(`✅ تم إنشاء تقرير التدقيق بنجاح: ${fullPath}`);
  // طباعة الرابط للـ API
  console.log(`DOWNLOAD_URL:${publicUrl}`);
}

// تنفيذ السكربت
generateAuditReport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ حدث خطأ أثناء إنشاء التقرير:", err);
    process.exit(1);
  });
