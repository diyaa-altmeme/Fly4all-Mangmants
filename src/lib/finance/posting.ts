"use server";

import { getDb } from '../firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

type JournalEntry = {
  accountId: string;
  debit: number;
  credit: number;
  currency?: string;
  description?: string;
};

type PostPayload = {
  sourceType: string;
  sourceId: string;
  date?: any;
  entries: JournalEntry[];
  meta?: any;
};

async function ensureAccountsExist(db: any, entries: JournalEntry[]) {
  const accountIds = Array.from(new Set(entries.map(e => e.accountId).filter(Boolean)));
  if (accountIds.length === 0) return;
  const refs = accountIds.map((id: string) => db.collection('chart_of_accounts').doc(id));
  const snaps = await Promise.all(refs.map((r: any) => r.get()));
  const missing = snaps.map((s: any, i: number) => (!s.exists ? accountIds[i] : null)).filter(Boolean);
  if (missing.length) throw new Error('Accounts not found: ' + missing.join(', '));
}

function isBalanced(entries: JournalEntry[]) {
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  // allow tiny float rounding
  return Math.abs(totalDebit - totalCredit) < 0.0001;
}

export async function postJournalEntries(payload: PostPayload) {
  const db = await getDb();

  if (!payload.entries || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw new Error('No entries provided');
  }

  // Validation: balanced
  if (!isBalanced(payload.entries)) {
    throw new Error('Entries are not balanced (debit != credit)');
  }

  // Validation: accounts exist
  await ensureAccountsExist(db, payload.entries);

  const now = Timestamp.now();
  const doc = {
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    date: payload.date || now,
    entries: payload.entries.map(e => ({ ...e })),
    meta: payload.meta || null,
    createdAt: now,
  };

  const ref = await db.collection('journal_vouchers').add(doc as any);
  return { id: ref.id };
}

import { getDb } from "@/lib/firebase-admin";
import type { FinanceAccountsMap } from "@/lib/types";

// جلب خريطة الربط من الإعدادات (كاش بسيط اختياري)
let _cache: { at: number; map: FinanceAccountsMap | null } = { at: 0, map: null };

export async function getFinanceMap(): Promise<FinanceAccountsMap> {
  const now = Date.now();
  if (_cache.map && now - _cache.at < 15_000) return _cache.map; // cache 15s

  const db = await getDb();
  const ref = db.collection("settings").doc("app_settings");
  const snap = await ref.get();
  const fm = (snap.data()?.financeAccounts || {}) as FinanceAccountsMap;
  _cache = { at: now, map: fm };
  return fm;
}

// مثال: إنشاء قيد إيراد لوحدة معينة (tickets/visas/...)
export async function postRevenue({
  sourceType, sourceId, date, currency, amount,
  clientId, // يُحفظ بالـ meta فقط (لا ننشئ حساب فرعي)
}: {
  sourceType: "tickets"|"visas"|"subscriptions"|"segments"|"profit_distribution";
  sourceId: string;
  date: string | Date;
  currency: string;
  amount: number;
  clientId?: string;
}) {
  if (amount <= 0) return;

  const db = await getDb();
  const fm = await getFinanceMap();

  const revenueAccountId = fm.revenueMap?.[sourceType];
  const arId = fm.receivableAccountId;
  if (!revenueAccountId || !arId) {
    throw new Error(`Missing mapping: revenue=${revenueAccountId} or AR=${arId}`);
  }

  if (fm.preventDirectCashRevenue && fm.defaultCashId) {
    // إيراد آجل (مدين: الذمم / دائن: الإيراد)
    return db.collection("journal-vouchers").add({
      date,
      currency,
      sourceType,
      sourceId,
      lines: [
        { accountId: arId, debit: amount, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: amount },
      ],
      meta: { clientId },
      createdAt: new Date(),
    });
  } else {
    // إيراد نقدي مباشرة (مدين: الصندوق / دائن: الإيراد)
    const cashId = fm.defaultCashId || arId; // fallback سيئ؛ الأفضل إجبار الربط
    return db.collection("journal-vouchers").add({
      date,
      currency,
      sourceType,
      sourceId,
      lines: [
        { accountId: cashId, debit: amount, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: amount },
      ],
      meta: { clientId, directCash: true },
      createdAt: new Date(),
    });
  }
}

// مثال: تسجيل تكلفة
export async function postCost({
  costKey, // cost_tickets/cost_visas/...
  sourceType, sourceId, date, currency, amount, supplierId
}: {
  costKey: keyof NonNullable<FinanceAccountsMap["expenseMap"]>;
  sourceType: string; sourceId: string;
  date: string|Date; currency: string; amount: number;
  supplierId?: string;
}) {
  if (amount <= 0) return;
  const db = await getDb();
  const fm = await getFinanceMap();
  const expId = fm.expenseMap?.[costKey];
  const apId = fm.payableAccountId;
  if (!expId || !apId) throw new Error(`Missing mapping: expense=${expId} or AP=${apId}`);

  return db.collection("journal-vouchers").add({
    date, currency, sourceType, sourceId,
    lines: [
      { accountId: expId, debit: amount, credit: 0 },
      { accountId: apId, debit: 0, credit: amount },
    ],
    meta: { supplierId },
    createdAt: new Date(),
  });
}
