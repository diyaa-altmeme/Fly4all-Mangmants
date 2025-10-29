
'use server';

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap, AppSettings } from "@/lib/types";
import { Timestamp } from 'firebase-admin/firestore';

const SETTINGS_DOC_ID = "app_settings";

const processDocWithDates = (doc: FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data() as any;
    if (!data) return null;

    const safeData = { ...data, id: doc.id };

    // Convert Firestore Timestamps to ISO strings
    for (const key in safeData) {
        if (safeData[key] && (safeData[key] instanceof Timestamp || safeData[key].toDate)) {
            safeData[key] = safeData[key].toDate().toISOString();
        }
    }
    return safeData;
}

export async function getChartOfAccounts() {
  const db = await getDb();
  const col = db.collection("chart_of_accounts");
  const snap = await col.orderBy("code").get();
  const accounts = snap.docs.map(doc => processDocWithDates(doc));
  return JSON.parse(JSON.stringify(accounts));
}

export async function getFinanceAccountsMap(): Promise<FinanceAccountsMap> {
  const db = await getDb();
  const ref = db.collection("settings").doc(SETTINGS_DOC_ID);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as AppSettings) : {};
  return data?.financeAccounts || {};
}

export async function updateFinanceAccountsMap(payload: FinanceAccountsMap) {
  const db = await getDb();
  const ref = db.collection("settings").doc(SETTINGS_DOC_ID);

  await ref.set({ financeAccounts: payload }, { merge: true });

  revalidatePath("/settings/advanced-accounts-setup");
  revalidatePath("/settings/finance");
  return { ok: true };
}

export async function saveFinanceAccountsMap(formData: FormData) {
    "use server";
    const payload = {
      receivableAccountId: formData.get("receivableAccountId") as string,
      payableAccountId: formData.get("payableAccountId") as string,
      defaultCashId: formData.get("defaultCashId") as string,
      defaultBankId: formData.get("defaultBankId") as string,
      preventDirectCashRevenue: (formData.get("preventDirectCashRevenue") as string) === "on",

      revenueMap: {
        tickets: formData.get("rev_tickets") as string,
        visas: formData.get("rev_visas") as string,
        subscriptions: formData.get("rev_subscriptions") as string,
        segments: formData.get("rev_segments") as string,
        profit_distribution: formData.get("rev_profit_dist") as string
      },
      expenseMap: {
        cost_tickets: formData.get("exp_cost_tickets") as string,
        cost_visas: formData.get("exp_cost_visas") as string,
        operating_salaries: formData.get("exp_oper_salaries") as string,
        operating_rent: formData.get("exp_oper_rent") as string,
        operating_utilities: formData.get("exp_oper_util") as string,
        marketing: formData.get("exp_marketing") as string
      }
    };
    await updateFinanceAccountsMap(payload);
}
