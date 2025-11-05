

'use server';

import { getDb } from "@/lib/firebase-admin";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import type { JournalVoucher, JournalEntry as LegacyJournalEntry, FinanceAccountsMap, Currency } from "../types";
import { normalizeFinanceAccounts } from '@/lib/finance/finance-accounts';
import { inferAccountCategory, type AccountCategory } from '@/lib/finance/account-categories';
import { getCurrentUserFromSession } from "../auth/actions";
import { Timestamp } from "firebase-admin/firestore";


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
  amount?: number;
  description?: string;
};

export type PostJournalPayload = {
  sourceType: string;          // "tickets" | "visas" | "subscriptions" | "segments" | "exchanges" | "profit-sharing" | ...
  sourceId: string;
  date?: number | Date;        // ms | Date
  entries: JournalEntry[];
  meta?: Record<string, any>;
  description?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  creditEntries?: JournalEntry[];
  amount?: number;
  userId?: string;
};

async function ensureAccountsExist(db: any, entries: JournalEntry[]) {
  const accountIds = Array.from(new Set(entries.map(e => e.accountId).filter(Boolean)));
  if (accountIds.length === 0) return;

  const collectionsToSearch = ['chart_of_accounts', 'clients', 'boxes', 'exchanges'];
  const foundIds = new Set<string>();

  for (const collectionName of collectionsToSearch) {
    const idsInCollection = accountIds.filter(id => !foundIds.has(id));
    if (idsInCollection.length === 0) continue;
    
    // Firestore 'in' query is limited to 30 items
    for (let i = 0; i < idsInCollection.length; i += 30) {
      const chunk = idsInCollection.slice(i, i + 30);
      const snapshot = await db.collection(collectionName).where(FieldPath.documentId(), 'in', chunk).get();
      snapshot.forEach((doc: any) => foundIds.add(doc.id));
    }
  }

  const missing = accountIds.filter(id => !foundIds.has(id) && !id.startsWith('expense_') && !id.startsWith('revenue_'));

  if (missing.length > 0) {
    console.warn('The following accounts were not found and might need to be created:', missing.join(', '));
    throw new Error('Accounts not found: ' + missing.join(', '));
  }
}

function isBalanced(entries: JournalEntry[]) {
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  // allow tiny float rounding
  return Math.abs(totalDebit - totalCredit) < 0.0001;
}

type StoredEntry = JournalEntry & {
  amount: number;
  description: string;
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
      const debitEntry: LegacyJournalEntry = {
        accountId: entry.accountId,
        amount: entry.debit,
        description: entry.description,
      };
      if (entry.relationId) debitEntry.relationId = entry.relationId;
      debitEntries.push(debitEntry);
    }

    if (entry.credit > 0) {
       const creditEntry: LegacyJournalEntry = {
        accountId: entry.accountId,
        amount: entry.credit,
        description: entry.description,
      };
       if (entry.relationId) creditEntry.relationId = entry.relationId;
       creditEntries.push(creditEntry);
    }
  }

  return { debitEntries, creditEntries };
}

function resolveCurrency(entries: JournalEntry[]): Currency {
  const first = entries.find(e => !!e.currency);
  return (first?.currency as Currency) || 'USD';
}

export async function postJournalEntry(payload: PostJournalPayload, fa?: NormalizedFinanceAccounts): Promise<string> {
  const db = await getDb();

  if (!payload.entries || !Array.isArray(payload.entries) || payload.entries.length === 0) {
    throw new Error('No entries provided');
  }

  await ensureAccountsExist(db, payload.entries);

  let postingUser: { uid: string; name?: string } | null = null;
  if (!payload.meta || !payload.meta.system) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Authentication required to post journal entries');
    if ('isClient' in user && user.isClient) throw new Error('Insufficient permissions');
    const allowed = user.role === 'admin' || (user.permissions && user.permissions.includes('vouchers:create'));
    if (!allowed) throw new Error('User lacks vouchers:create permission');
    postingUser = { uid: user.uid, name: user.name };
  }

  if (!isBalanced(payload.entries)) {
    throw new Error('Entries are not balanced (debit != credit)');
  }
  
  const finance = fa || await getFinanceMap();

  if (finance?.preventDirectCashRevenue) {
    const cashId = finance.defaultCashId;
    if (cashId) {
      for (const e of payload.entries) {
        if (e.accountId === cashId && inferAccountCategory(e.accountId, finance || null) === 'revenue') {
             throw new Error('Direct cash posting is disabled by finance settings');
        }
      }
    }
  }

  const now = Timestamp.now();
  const voucherRef = db.collection('journal-vouchers').doc();
  const voucherNumber = await getNextVoucherNumber(payload.sourceType.toUpperCase());
  const voucherCurrency = resolveCurrency(payload.entries);

  const storedEntries = payload.entries.map((entry) => {
    const debit = Number(entry.debit) || 0;
    const credit = Number(entry.credit) || 0;
    const amount = debit > 0 ? debit : credit;
    const description = entry.note ?? entry.description ?? payload.description ?? '';
    const accountType = inferAccountCategory(entry.accountId, finance || null);
    
    const finalEntry: StoredEntry = {
      ...entry, debit, credit, amount,
      currency: entry.currency || voucherCurrency,
      description: description || '',
      accountType,
    };
    if (!finalEntry.relationId) delete finalEntry.relationId;
    if (!finalEntry.companyId) delete finalEntry.companyId;

    return finalEntry;
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
    entries: storedEntries.map(entry => {
      const e: any = {
        accountId: entry.accountId,
        debit: entry.debit,
        credit: entry.credit,
        amount: entry.amount,
        description: entry.description,
        currency: entry.currency,
        accountType: entry.accountType,
        type: entry.debit > 0 ? 'debit' : 'credit',
      }
      if(entry.relationId) e.relationId = entry.relationId;
      if(entry.companyId) e.companyId = entry.companyId;
      return e;
    }),
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

  return postJournalEntry({
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

  return postJournalEntry({
    sourceType,
    sourceId,
    date: typeof date === 'string' ? Date.parse(date) : date.getTime(),
    entries,
    meta: { supplierId },
    description: 'قيد مصروف',
  }, fm);
}
