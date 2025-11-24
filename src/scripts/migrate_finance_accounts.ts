
/**
 * سكربت ترحيل العمليات القديمة إلى النظام المالي الجديد
 * ----------------------------------------------
 * الغرض: إنشاء قيود محاسبية صحيحة لكل عملية تمت سابقًا
 *         بناءً على الإعدادات الموجودة في مركز التحكم المالي
 */

import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import { postJournalEntry } from "@/lib/finance/postJournal";

async function migrateFinanceAccounts() {
  const db = await getDb();

  console.log("🔄 بدء عملية الترحيل المالي...");

  // 1️⃣ جلب إعدادات مركز التحكم المالي
  const settingsDoc = await db.collection("settings").doc("app").get();
  if (!settingsDoc.exists) throw new Error("❌ لم يتم العثور على وثيقة الإعدادات المالية!");

  const settings = settingsDoc.data()?.financeAccountsSettings;
  if (!settings) throw new Error("❌ إعدادات الحسابات المالية غير موجودة في الوثيقة!");

  const preventDirectCash = settings.preventDirectCashProfit ?? false;

  // 2️⃣ تعريف أنواع العمليات التي سيتم ترحيلها
  const collectionsToMigrate = [
    { name: "bookings", type: "booking" },
    { name: "visas", type: "visa" },
    { name: "subscriptions", type: "subscription" },
    { name: "segments", type: "segment" },
    { name: "expenses", type: "manualExpense" },
  ];

  let totalPosted = 0;

  // 3️⃣ المرور على كل مجموعة بيانات وترحيلها
  for (const col of collectionsToMigrate) {
    const snapshot = await db.collection(col.name).get();
    console.log(`🧾 معالجة ${snapshot.size} من ${col.name}`);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // تحديد الحقول الضرورية
      const amount =
        data.totalAmount || data.amount || data.total || data.value || 0;
      if (!amount || amount <= 0) continue;

      const currency = data.currency || "USD";
      const description = `ترحيل ${col.name} رقم ${doc.id}`;
      const date = data.date ? new Date(data.date) : new Date();
      const userId = data.createdBy || "migration-script";

      try {
        await postJournalEntry({
          sourceType: col.type,
          sourceId: doc.id,
          description,
          amount,
          currency,
          date,
          userId,
        });

        totalPosted++;
      } catch (err: any) {
        console.error(`❌ فشل ترحيل ${col.name} (${doc.id}):`, err.message);
      }
    }
  }

  console.log(`✅ تمت عملية الترحيل بنجاح، تم إنشاء ${totalPosted} قيدًا محاسبيًا.`);
}

// تنفيذ السكربت
migrateFinanceAccounts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ خطأ أثناء تنفيذ سكربت الترحيل:", err);
    process.exit(1);
  });
