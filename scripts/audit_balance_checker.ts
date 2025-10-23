
/**
 * سكربت التحقق من توازن القيود المحاسبية
 * ----------------------------------------------
 * الهدف: التأكد من أن جميع القيود في journal-vouchers متوازنة (Total Debits = Total Credits)
 *         وإصلاح الحالات الناقصة أو الخاطئة بشكل تلقائي.
 */

import { getDb } from "@/lib/firebase-admin";

async function auditBalanceChecker() {
  const db = await getDb();
  console.log("🔍 بدء عملية التحقق من توازن القيود...");

  const vouchersSnap = await db.collection("journal-vouchers").get();
  console.log(`🧾 عدد القيود التي سيتم فحصها: ${vouchersSnap.size}`);

  let balancedCount = 0;
  let fixedCount = 0;
  let errorCount = 0;

  for (const doc of vouchersSnap.docs) {
    const data = doc.data();
    const debitEntries = data.debitEntries || [];
    const creditEntries = data.creditEntries || [];

    // حساب إجمالي المبالغ المدينة والدائنة
    const totalDebits = debitEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalCredits = creditEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // التحقق من اكتمال البيانات الأساسية
    if (debitEntries.length === 0 || creditEntries.length === 0 || totalDebits <= 0) {
      console.warn(`⚠️ القيد ${doc.id} ناقص بيانات (لا يحتوي على أطراف مدينة أو دائنة).`);
      errorCount++;
      continue;
    }

    // التحقق من التوازن
    if (Math.abs(totalDebits - totalCredits) < 0.001) {
      balancedCount++;
      continue; // القيد متوازن ✅
    }

    // القيد غير متوازن، سيتم محاولة إصلاحه
    console.warn(`🟡 القيد ${doc.id} غير متوازن! Debits: ${totalDebits}, Credits: ${totalCredits}`);

    // تطبيق منطق الإصلاح فقط على القيود البسيطة (طرف واحد مدين وطرف واحد دائن)
    if (debitEntries.length === 1 && creditEntries.length === 1) {
      const fixedAmount = (totalDebits + totalCredits) / 2;
      
      const newDebitEntries = [{ ...debitEntries[0], amount: fixedAmount }];
      const newCreditEntries = [{ ...creditEntries[0], amount: fixedAmount }];

      try {
        await db.collection("journal-vouchers").doc(doc.id).update({
          debitEntries: newDebitEntries,
          creditEntries: newCreditEntries,
          auditFixedAt: new Date().toISOString(),
          auditFixedBy: "balance-checker",
          auditNote: `Imbalance found (D:${totalDebits}, C:${totalCredits}). Auto-fixed by averaging.`
        });
        fixedCount++;
        console.log(`🔧 تم إصلاح القيد ${doc.id} ليصبح متوازنًا بمبلغ ${fixedAmount}.`);
      } catch (err: any) {
        console.error(`❌ خطأ أثناء إصلاح القيد ${doc.id}:`, err.message);
        errorCount++;
      }
    } else {
      console.error(`❌ لا يمكن إصلاح القيد ${doc.id} تلقائيًا لأنه معقد (أكثر من طرف مدين/دائن).`);
      errorCount++;
    }
  }

  console.log("\n✅ عملية التحقق من التوازن اكتملت:");
  console.log(`✅ القيود السليمة والمتوازنة: ${balancedCount}`);
  console.log(`⚙️ القيود التي تم إصلاحها: ${fixedCount}`);
  console.log(`❌ القيود التي تحتوي على أخطاء أو لم يتم إصلاحها: ${errorCount}`);
}

// تنفيذ السكربت
auditBalanceChecker()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ خطأ فادح أثناء تنفيذ عملية التحقق:", err);
    process.exit(1);
  });
