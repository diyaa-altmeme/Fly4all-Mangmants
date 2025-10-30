
'use server';

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap, AppSettings } from "@/lib/types";

const SETTINGS_DOC_ID = "app_settings";

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

  try {
    await ref.set({ financeAccounts: payload }, { merge: true });
    revalidatePath("/settings"); // Revalidate the main settings page
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}
