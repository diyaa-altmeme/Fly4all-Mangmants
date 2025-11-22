
/**
 * سكربت التحقق من سلامة النظام المالي
 * ----------------------------------------------
 * الغرض: التأكد من وجود قيد محاسبي لكل عملية مالية،
 *         وفي حال عدم وجوده يتم إنشاؤه تلقائيًا.
 */

import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import { postJournalEntry } from "@/lib/finance/postJournal";

async function auditFinanceIntegrity() {
  const db = await getDb();

  console.log("🔍 بدء عملية الفحص المحاسبي...");

  // 1️⃣ تحميل إعدادات مركز التحكم المالي
  const settingsDoc = await db.collection("settings").doc("app").get();
  if (!settingsDoc.exists) throw new Error("❌ لم يتم العثور على وثيقة الإعدادات المالية!");

  const settings = settingsDoc.data()?.financeAccountsSettings;
  if (!settings) throw new Error("❌ لم يتم ضبط إعدادات مركز التحكم المالي بعد!");

  // 2️⃣ تعريف أنواع العمليات
  const collectionsToCheck = [
    { name: "bookings", type: "booking" },
    { name: "visas", type: "visa" },
    { name: "subscriptions", type: "subscription" },
    { name: "segments", type: "segment" },
    { name: "expenses", type: "manualExpense" },
  ];

  let totalChecked = 0;
  let totalFixed = 0;

  for (const col of collectionsToCheck) {
    const snapshot = await db.collection(col.name).get();
    console.log(`🧾 فحص ${snapshot.size} سجل من ${col.name}`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const amount = data.totalAmount || data.amount || data.total || data.value || 0;
      if (!amount || amount <= 0) continue;

      const currency = data.currency || "USD";
      const sourceId = doc.id;
      const sourceType = col.type;

      // تحقق من وجود قيد محاسبي
      const existingVoucher = await db
        .collection("journal-vouchers")
        .where("sourceId", "==", sourceId)
        .where("sourceType", "==", sourceType)
        .limit(1)
        .get();

      if (!existingVoucher.empty) {
        totalChecked++;
        continue; // العملية لديها قيد بالفعل ✅
      }

      // إذا لم يوجد قيد — إنشاؤه الآن
      try {
        await postJournalEntry({
          sourceType,
          sourceId,
          description: `إنشاء قيد مفقود لعملية ${col.name} (${sourceId})`,
          amount,
          currency,
          date: new Date(),
          userId: "audit-checker",
        });

        totalFixed++;
        console.log(`⚙️ تم إنشاء قيد مفقود لعملية ${col.name} (${sourceId})`);
      } catch (err: any) {
        console.error(`❌ فشل إصلاح ${col.name} (${sourceId}):`, err.message);
      }
    }
  }

  console.log("✅ عملية الفحص المحاسبي اكتملت:");
  console.log(`عدد العمليات التي تم فحصها: ${totalChecked}`);
  console.log(`عدد العمليات التي تم إصلاحها وإنشاء قيد لها: ${totalFixed}`);
}

// تنفيذ السكربت
auditFinanceIntegrity()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ خطأ أثناء تنفيذ عملية الفحص:", err);
    process.exit(1);
  });
