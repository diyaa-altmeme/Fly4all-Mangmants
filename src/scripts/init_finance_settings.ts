'use server';

import { getDb } from "@/lib/firebase/firebase-admin-sdk";

async function initFinanceSettings() {
  const db = await getDb();
  const ref = db.collection("settings").doc("app");
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      financeAccountsSettings: {
        defaultCashAccount: null,
        defaultBankAccount: null,
        defaultReceivableAccount: null,
        defaultPayableAccount: null,
        defaultRevenueAccount: null,
        defaultExpenseAccount: null,
        preventDirectCashProfit: false,
      },
    }, { merge: true });
    console.log("✅ تم إنشاء إعدادات مركز التحكم المالي لأول مرة.");
  } else {
    // If the document exists, check if financeAccountsSettings field exists
    const data = snap.data();
    if (!data?.financeAccountsSettings) {
      await ref.update({
        'financeAccountsSettings': {
          defaultCashAccount: null,
          defaultBankAccount: null,
          defaultReceivableAccount: null,
          defaultPayableAccount: null,
          defaultRevenueAccount: null,
          defaultExpenseAccount: null,
          preventDirectCashProfit: false,
        }
      });
      console.log("✅ تم إضافة حقل إعدادات التمويل إلى المستند الحالي.");
    } else {
      console.log("⚠️ الإعدادات موجودة مسبقًا.");
    }
  }
}

initFinanceSettings()
  .then(async () => {
    console.log("Script finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ خطأ أثناء الإنشاء:", err);
    process.exit(1);
  });
