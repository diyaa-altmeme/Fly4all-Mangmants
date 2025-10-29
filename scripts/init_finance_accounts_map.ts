
#!/usr/bin/env tsx
import { getDb } from "@/lib/firebase-admin";

async function main() {
  const db = await getDb();
  const settingsRef = db.collection("settings").doc("app_settings");
  const snap = await settingsRef.get();

  const base: any = {
    financeAccounts: {
      receivableAccountId: "",
      payableAccountId: "",
      defaultCashId: "",
      defaultBankId: "",
      preventDirectCashRevenue: true,
      revenueMap: {
        tickets: "",
        visas: "",
        subscriptions: "",
        segments: "",
        profit_distribution: ""
      },
      expenseMap: {
        cost_tickets: "",
        cost_visas: "",
        operating_salaries: "",
        operating_rent: "",
        operating_utilities: "",
        marketing: ""
      }
    }
  };

  if (!snap.exists) {
    await settingsRef.set(base, { merge: true });
    console.log("✅ settings/app_settings created with financeAccounts.");
  } else {
    await settingsRef.set(base, { merge: true });
    console.log("✅ financeAccounts ensured on settings/app_settings.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
