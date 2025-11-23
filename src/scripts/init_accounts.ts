
'use server';
import { getDb } from "@/lib/firebase/firebase-admin-sdk";

async function initAccounts() {
  const db = await getDb();
  const baseAccounts = [
    { code: "1000", name: "الصندوق الرئيسي", type: "asset" },
    { code: "1100", name: "الحساب البنكي", type: "asset" },
    { code: "1200", name: "الذمم المدينة (العملاء)", type: "asset" },
    { code: "2100", name: "الذمم الدائنة (الموردين)", type: "liability" },
    { code: "4000", name: "الإيرادات العامة", type: "income" },
    { code: "5000", name: "المصروفات العامة", type: "expense" },
  ];

  for (const acc of baseAccounts) {
    const snap = await db.collection("accounts").where("code", "==", acc.code).get();
    if (snap.empty) {
      await db.collection("accounts").add(acc);
      console.log(`✅ تم إنشاء الحساب: ${acc.name}`);
    } else {
      console.log(`⚠️ الحساب موجود مسبقًا: ${acc.name}`);
    }
  }

  console.log("🚀 تمت تهيئة الحسابات الأساسية بنجاح!");
}

initAccounts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ خطأ أثناء الإنشاء:", err);
    process.exit(1);
  });
