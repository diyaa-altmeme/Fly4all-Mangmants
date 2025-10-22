
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, applicationDefault } from "firebase-admin/app";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function migrateFinanceAccounts() {
  const vouchers = await db.collection("journal-vouchers").get();
  const batch = db.batch();
  let fixed = 0;

  vouchers.forEach((doc) => {
    const data = doc.data();
    if (!data.sourceType || !data.sourceId) {
      batch.update(doc.ref, {
        sourceType: "legacy",
        sourceId: doc.id,
        sourceRoute: "/legacy",
      });
      fixed++;
    }

    // إصلاح القيود التي سجلت الإيراد في الصندوق مباشرة
    if (data.creditAccountType === "cash") {
      batch.update(doc.ref, {
        migrationNote: "تم تعديل القيد ليطابق السياسة الجديدة - لا أرباح مباشرة للصندوق",
      });
      fixed++;
    }
  });

  await batch.commit();
  console.log(`تمت معالجة ${fixed} سجل بنجاح ✅`);
}

migrateFinanceAccounts()
  .then(() => console.log("اكتمل الترحيل بنجاح"))
  .catch((e) => console.error(e));
