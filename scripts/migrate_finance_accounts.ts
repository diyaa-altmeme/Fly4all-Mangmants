import { getDb } from "../src/lib/firebase-admin";
import { getSettings, updateSettings } from "../src/app/settings/actions";

export async function migrateFinanceAccounts() {
  const db = getDb();
  const settings = await getSettings();
  const finance = settings?.financeAccounts || {};

  const accounts: { [key: string]: string | undefined } = {
    receivableAccountId: "1200",
    payableAccountId: "2100",
    revenueAccountId: "4000",
    expenseAccountId: "5000",
    cashAccountId: "1000",
    bankAccountId: "1100",
  };

  // إنشاء الحسابات المفقودة تلقائيًا
  for (const [key, code] of Object.entries(accounts)) {
    if (!code) continue;
    const snapshot = await db.collection("accounts").where("code", "==", code).get();
    if (snapshot.empty) {
      const docRef = await db.collection("accounts").add({
        code,
        name: key.replace("AccountId", ""),
        type: key.includes("revenue") ? "income" : key.includes("expense") ? "expense" : "asset",
      });
      accounts[key] = docRef.id;
    } else {
      accounts[key] = snapshot.docs[0].id;
    }
  }

  // تحديث الإعدادات الجديدة
  await updateSettings({
    ...settings,
    financeAccounts: {
      ...finance,
      ...accounts,
      revenueMap: {
        tickets: accounts.revenueAccountId,
        hotels: accounts.revenueAccountId,
        visas: accounts.revenueAccountId,
        subscriptions: accounts.revenueAccountId,
      },
      blockDirectCashRevenue: true,
    } as any,
  });

  console.log("✅ تمت عملية التهيئة والترحيل بنجاح.");
}

async function migrateJournalVouchers() {
  const db = getDb();
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

async function main() {
    console.log("Starting financial accounts migration...");
    await migrateFinanceAccounts();
    console.log("Financial accounts migration completed.");
    console.log("Starting journal voucher migration...");
    await migrateJournalVouchers();
    console.log("Journal voucher migration completed.");
}

main().catch(console.error);
