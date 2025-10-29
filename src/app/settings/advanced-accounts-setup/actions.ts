
"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap, AppSettings } from "@/lib/types";

const SETTINGS_DOC_ID = "app_settings";

export async function getChartOfAccounts() {
  const db = await getDb();
  const col = db.collection("chart_of_accounts");
  const snap = await col.orderBy("code").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

  // انعكاس فوري
  revalidatePath("/settings/advanced-accounts-setup");
  revalidatePath("/settings/finance");
  return { ok: true };
}
