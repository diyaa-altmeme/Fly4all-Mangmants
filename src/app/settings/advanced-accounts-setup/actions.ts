"use server";

import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap, ChartAccount } from "@/lib/types";
import { normalizeFinanceAccounts, serializeFinanceAccounts, type NormalizedFinanceAccounts, type FinanceAccountsInput } from '@/lib/finance/finance-accounts';

const SETTINGS_COLL = "settings";
const SETTINGS_DOC  = "app_settings";

export async function getChartOfAccounts(): Promise<ChartAccount[]> {
  const db = await getDb();
  const snap = await db.collection("chart_of_accounts").orderBy("code").get();
  // حوّل Timestamps إلى أرقام/تواريخ بدائية لتجنب أخطاء RSC
  return snap.docs.map(d => {
    const data = d.data();
    const toMs = (t: any) => (t?.toDate ? t.toDate().getTime() : (typeof t === "number" ? t : Date.now()));
    return {
      id: d.id,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId ?? null,
      parentCode: data.parentCode ?? null,
      isLeaf: !!data.isLeaf,
      description: data.description ?? "",
      createdAt: toMs(data.createdAt),
      updatedAt: toMs(data.updatedAt),
    } as ChartAccount;
  });
}

export async function getFinanceAccounts(): Promise<NormalizedFinanceAccounts | null> {
  const db = await getDb();
  const doc = await db.collection(SETTINGS_COLL).doc(SETTINGS_DOC).get();
  const s = doc.data() || {};
  const raw = (s.financeAccounts ?? null) as FinanceAccountsMap | null;
  if (!raw) return null;
  return normalizeFinanceAccounts(raw);
}

export async function saveFinanceAccounts(payload: FinanceAccountsInput): Promise<void> {
  const db = await getDb();
  const serialized = serializeFinanceAccounts(payload);
  await db.collection(SETTINGS_COLL).doc(SETTINGS_DOC).set(
    { financeAccounts: serialized },
    { merge: true }
  );
}

export async function getFinanceSettings(): Promise<NormalizedFinanceAccounts | null> {
  return await getFinanceAccounts();
}
