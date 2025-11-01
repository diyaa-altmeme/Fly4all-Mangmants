
'use server';

import { getDb } from '@/lib/firebase-admin';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import type { Currency, FinanceAccountsMap, JournalEntry as LegacyJournalEntry } from '@/lib/types';
import {
  normalizeFinanceAccounts,
  type NormalizedFinanceAccounts,
} from '@/lib/finance/finance-accounts';
import { Timestamp } from 'firebase-admin/firestore';
import { getNextVoucherNumber } from '@/lib/sequences';
import { inferAccountCategory } from '@/lib/finance/account-categories';

export type JournalEntry = {
  accountId: string;
  debit: number;       // >= 0
  credit: number;      // >= 0
  currency: Currency;
  exchangeRate?: number;
  relationId?: string;     // NEW: علاقة مرتبطة بالقيد
  companyId?: string;
  note?: string;
  accountType?: string;
};

export type PostJournalPayload = {
  sourceType: string;          // "tickets" | "visas" | "subscriptions" | "segments" | "exchanges" | "profit-sharing" | ...
  sourceId: string;
  date?: number | Date;        // ms | Date
  entries: JournalEntry[];
  meta?: Record<string, any>;
  description?: string;
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

type StoredEntry = JournalEntry & {
  amount: number;
  description?: string;
  accountType?: string;
};

function splitEntries(entries: StoredEntry[]): {
  debitEntries: LegacyJournalEntry[];
  creditEntries: LegacyJournalEntry[];
} {
  const debitEntries: LegacyJournalEntry[] = [];
  const creditEntries: LegacyJournalEntry[] = [];

  for (const entry of entries) {
    if (entry.debit > 0) {
      debitEntries.push({
        accountId: entry.accountId,
        amount: entry.debit,
        description: entry.description ?? entry.note,
        currency: entry.currency,
        relationId: entry.relationId,
        companyId: entry.companyId,
        accountType: entry.accountType,
      });
    }

    if (entry.credit > 0) {
      creditEntries.push({
        accountId: entry.accountId,
        amount: entry.credit,
        description: entry.description ?? entry.note,
        currency: entry.currency,
        relationId: entry.relationId,
        companyId: entry.companyId,
        accountType: entry.accountType,
      });
    }
  }

  return { debitEntries, creditEntries };
}

function resolveCurrency(entries: JournalEntry[]): Currency {
  const first = entries.find(e => !!e.currency);
  return (first?.currency as Currency) || 'USD';
}

export async function postJournalEntries(payload: PostJournalPayload, fa?: NormalizedFinanceAccounts) {
  const db = await getDb();

  if (!payload.entries || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw new Error('No entries provided');
  }

  // Permission check: unless caller set meta.system === true, require user has vouchers:create
  let postingUser: { uid: string; name?: string } | null = null;
  if (!payload.meta || !payload.meta.system) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Authentication required to post journal entries');
    // deny clients
    if ('isClient' in user && user.isClient) throw new Error('Insufficient permissions');
    const allowed = user.role === 'admin' || (user.permissions && user.permissions.includes('vouchers:create'));
    if (!allowed) throw new Error('User lacks vouchers:create permission');
    postingUser = { uid: user.uid, name: user.name };
  }

  // Validation and checks
  // 1) balanced
  if (!isBalanced(payload.entries)) {
    throw new Error('Entries are not balanced (debit != credit)');
  }

  // 2) accounts exist
  await ensureAccountsExist(db, payload.entries);

  // 3) optional finance map checks
  if (!fa) {
    try { fa = await getFinanceMap(); } catch (e) { /* ignore */ }
  }

  const finance = fa;

  if (finance?.preventDirectCashRevenue) {
    // guard: prevent direct cash posting when flagged (caller should pass fa if needed)
    const cashId = finance.defaultCashId;
    if (cashId) {
      for (const e of payload.entries) {
        if (e.accountId === cashId) throw new Error('Direct cash posting is disabled by finance settings');
      }
    }
  }

  const now = Timestamp.now();
  const voucherRef = db.collection('journal-vouchers').doc();
  const voucherNumber = await getNextVoucherNumber(payload.sourceType.toUpperCase());
  const voucherCurrency = resolveCurrency(payload.entries);

  const storedEntries: StoredEntry[] = payload.entries.map((entry) => {
    const debit = Number(entry.debit) || 0;
    const credit = Number(entry.credit) || 0;
    const amount = debit > 0 ? debit : credit;
    const description = entry.note ?? (entry as any).description;
    const accountType = inferAccountCategory(entry.accountId, finance || null);

    return {
      ...entry,
      debit,
      credit,
      amount,
      currency: entry.currency || voucherCurrency,
      description,
      accountType,
    };
  });

  const { debitEntries, creditEntries } = splitEntries(storedEntries);
  const voucherDate = payload.date instanceof Date
    ? payload.date.toISOString()
    : payload.date
      ? new Date(payload.date).toISOString()
      : new Date().toISOString();

  const createdBy = payload.meta?.createdBy || postingUser?.uid || 'system';
  const officer = payload.meta?.officer || postingUser?.name || 'system';

  await voucherRef.set({
    id: voucherRef.id,
    invoiceNumber: voucherNumber,
    date: voucherDate,
    currency: resolveCurrency(payload.entries),
    notes: payload.description || '',
    createdBy,
    officer,
    createdAt: now,
    updatedAt: now,
    voucherType: `journal_from_${payload.sourceType}`,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    debitEntries,
    creditEntries,
    isAudited: false,
    isConfirmed: true,
    meta: payload.meta || null,
    entries: storedEntries.map(entry => ({
      accountId: entry.accountId,
      debit: entry.debit,
      credit: entry.credit,
      amount: entry.amount,
      description: entry.description ?? entry.note,
      currency: entry.currency,
      relationId: entry.relationId,
      companyId: entry.companyId,
      accountType: entry.accountType,
      type: entry.debit > 0 ? 'debit' : 'credit',
    })),
    originalData: {
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      meta: payload.meta || null,
    },
  } as any);

  return voucherRef.id;
}


// جلب خريطة الربط من الإعدادات (كاش بسيط اختياري)
let _cache: { at: number; map: NormalizedFinanceAccounts | null } = { at: 0, map: null };

export async function getFinanceMap(): Promise<NormalizedFinanceAccounts> {
  const now = Date.now();
  if (_cache.map && now - _cache.at < 15_000) return _cache.map; // cache 15s

  const db = await getDb();
  const ref = db.collection("settings").doc("app_settings");
  const snap = await ref.get();
  const fmRaw = (snap.data()?.financeAccounts || {}) as FinanceAccountsMap;
  const fm = normalizeFinanceAccounts(fmRaw);
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

  const fm = await getFinanceMap();

  const revenueAccountId = fm.revenueMap?.[sourceType] || fm.generalRevenueId;
  const arId = fm.receivableAccountId;
  if (!revenueAccountId || !arId) {
    throw new Error(`Missing mapping: revenue=${revenueAccountId} or AR=${arId}`);
  }

  const shouldDefer = fm.preventDirectCashRevenue && fm.defaultCashId;
  const debitAccountId = shouldDefer ? arId : (fm.defaultCashId || arId);

  const entries: JournalEntry[] = [
    {
      accountId: debitAccountId,
      debit: amount,
      credit: 0,
      currency: currency as Currency,
      note: shouldDefer ? 'إثبات إيراد آجل' : 'إثبات إيراد نقدي',
      relationId: clientId,
    },
    {
      accountId: revenueAccountId,
      debit: 0,
      credit: amount,
      currency: currency as Currency,
      note: 'قيد الإيراد',
      relationId: clientId,
    },
  ];

  return postJournalEntries({
    sourceType,
    sourceId,
    date: typeof date === 'string' ? Date.parse(date) : date.getTime(),
    entries,
    meta: { clientId, directCash: !shouldDefer },
    description: shouldDefer ? 'قيد إيراد آجل' : 'قيد إيراد نقدي',
  }, fm);
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
  const fm = await getFinanceMap();
  const expId = fm.expenseMap?.[costKey] || fm.generalExpenseId;
  const apId = fm.payableAccountId;
  if (!expId || !apId) throw new Error(`Missing mapping: expense=${expId} or AP=${apId}`);

  const entries: JournalEntry[] = [
    {
      accountId: expId,
      debit: amount,
      credit: 0,
      currency: currency as Currency,
      note: 'تسجيل مصروف',
      relationId: supplierId,
    },
    {
      accountId: apId,
      debit: 0,
      credit: amount,
      currency: currency as Currency,
      note: 'تسجيل ذمم دائنة للمورد',
      relationId: supplierId,
    },
  ];

  return postJournalEntries({
    sourceType,
    sourceId,
    date: typeof date === 'string' ? Date.parse(date) : date.getTime(),
    entries,
    meta: { supplierId },
    description: 'قيد مصروف',
  }, fm);
}
