"use server";

import { getDb } from '../../../lib/firebase-admin';

export async function getAccountsLite(): Promise<any[]> {
  const db = await getDb();
  const snap = await db.collection('chart_of_accounts').orderBy('code', 'asc').get();
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
    };
  });
}

export async function getFinanceAccounts(): Promise<any> {
  const db = await getDb();
  const doc = await db.collection('settings').doc('app_settings').get();
  const data = doc.exists ? doc.data() : {};
  return {
    financeAccounts: data?.financeAccounts || {
      arAccountId: null,
      apAccountId: null,
      defaultCashId: null,
      defaultBankId: null,
      preventDirectCashRevenue: true,
      revenueMap: { tickets: null, visas: null, subscriptions: null, segments: null },
      expenseMap: { tickets: null, visas: null, subscriptions: null },
    }
  };
}

export async function saveFinanceAccounts(input: any): Promise<void> {
  const db = await getDb();
  // Basic validation: ensure referenced IDs exist if provided
  const validateId = async (id?: string | null) => {
    if (!id) return true;
    const doc = await db.collection('chart_of_accounts').doc(id).get();
    return doc.exists;
  };

  const promises: Promise<boolean>[] = [];
  const fa = input.financeAccounts || input;
  ['arAccountId','apAccountId','defaultCashId','defaultBankId'].forEach(k => {
    promises.push(validateId(fa?.[k]));
  });

  const results = await Promise.all(promises);
  if (results.some(r => r === false)) throw new Error('One or more account IDs are invalid');

  await db.collection('settings').doc('app_settings').set({ financeAccounts: fa }, { merge: true });
}

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
