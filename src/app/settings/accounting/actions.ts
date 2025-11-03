
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { FinanceAccountsMap } from '@/lib/types';
import { normalizeFinanceAccounts, serializeFinanceAccounts, type NormalizedFinanceAccounts, type FinanceAccountsInput } from '@/lib/finance/finance-accounts';

const SETTINGS_COLL = "settings";
const SETTINGS_DOC  = "app_settings";

export async function getFinanceAccountsMap(): Promise<NormalizedFinanceAccounts> {
  const db = await getDb();
  const doc = await db.collection(SETTINGS_COLL).doc(SETTINGS_DOC).get();
  const s = doc.data() || {};
  const raw = (s.financeAccounts ?? {}) as FinanceAccountsMap;
  return normalizeFinanceAccounts(raw);
}

export async function updateFinanceAccountsMap(payload: FinanceAccountsInput) {
  try {
    const db = await getDb();
    const serialized = serializeFinanceAccounts(payload);
    await db.collection(SETTINGS_COLL).doc(SETTINGS_DOC).set(
      { financeAccounts: serialized },
      { merge: true }
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getFinanceSettings(): Promise<NormalizedFinanceAccounts | null> {
  return await getFinanceAccountsMap();
}
