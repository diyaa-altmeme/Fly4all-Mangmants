

'use server';

import { getDb } from "@/lib/firebase-admin";
import { FieldValue, FieldPath, Timestamp } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';
import { getNextVoucherNumber } from "@/lib/sequences";
import { normalizeVoucherType } from "@/lib/accounting/voucher-types";
import type { JournalEntry as LegacyJournalEntry, FinanceAccountsMap, Currency, User } from "../types";
import { normalizeFinanceAccounts, type NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';
import { inferAccountCategory, type AccountCategory } from '@/lib/finance/account-categories';
import { getSettings } from "@/app/settings/actions";
import { getCurrentUserFromSession } from '@/app/(auth)/actions';


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
  voucherId?: string;
  invoiceNumber?: string;
  sourceType: string;
  sourceId: string;
  date?: number | Date;
  entries?: JournalEntry[];
  meta?: Record<string, any>;
  description?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  creditEntries?: LegacyJournalEntry[];
  amount?: number;
  currency?: Currency;
  userId?: string;
  mergeMeta?: boolean;
  actor?: { uid: string; name?: string } | null;
};

const SEQUENCE_ALIAS_MAP: Record<string, string> = {
  voucher: 'JE',
  journal: 'JE',
  'journal-voucher': 'JE',
  journal_voucher: 'JE',
  booking: 'BK',
  bookings: 'BK',
  visa: 'VS',
  visas: 'VS',
  refund: 'RF',
  refunds: 'RF',
  payment: 'PV',
  payments: 'PV',
  receipt: 'RC',
  receipts: 'RC',
  standard_receipt: 'RC',
  distributed_receipt: 'DS',
  manualExpense: 'EX',
  manual_expense: 'EX',
  manualexpensevoucher: 'EX',
  remittance: 'TR',
  transfer: 'TR',
  subscription: 'SUB',
  subscription_installment: 'SUBP',
  subscription_overpayment: 'SUBP',
  subscription_adjustment: 'SUB',
  subscription_reversal: 'SUB',
  segment: 'SEG',
  segment_period: 'SEG',
  segment_payout: 'PARTNER',
  partner: 'PARTNER',
  partner_share: 'PARTNER',
  partnerpayment: 'PARTNER',
  company_share: 'COMP',
  comp: 'COMP',
  profit_sharing: 'PR',
  'profit-sharing': 'PR',
  profit_distribution: 'PR',
  exchange: 'EXC',
  exchange_transaction: 'EXT',
  exchanges: 'EXT',
  exchange_payment: 'EXP',
  exchange_expense: 'EXP',
  exchange_revenue: 'EXT',
  exchange_adjustment: 'EXT',
  client: 'CL',
  relation: 'CL',
  supplier: 'CL',
  void: 'VOID',
  salary: 'PV',
};

const resolveSequenceId = (sourceType?: string | null): string | null => {
  if (!sourceType) return null;
  const trimmed = `${sourceType}`.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (SEQUENCE_ALIAS_MAP[lower]) {
    return SEQUENCE_ALIAS_MAP[lower];
  }
  const upper = trimmed.toUpperCase();
  return upper;
};


const buildEntriesFromLegacyPayload = (payload: PostJournalPayload): JournalEntry[] => {
  const entries: JournalEntry[] = [];
  const fallbackCurrency = payload.currency || (payload.meta?.currency as Currency) || 'USD';
  const fallbackDescription = payload.description || '';

  if (payload.debitAccountId && (payload.amount ?? 0) !== 0) {
    entries.push({
      accountId: payload.debitAccountId,
      debit: Number(payload.amount) || 0,
      credit: 0,
      currency: fallbackCurrency,
      description: fallbackDescription,
      relationId: payload.meta?.clientId || payload.meta?.relationId || undefined,
      companyId: payload.meta?.companyId,
    });
  }

  if (Array.isArray(payload.creditEntries)) {
    for (const entry of payload.creditEntries) {
      if (!entry.accountId) continue;
      const explicitDebit = Number(entry.debit ?? 0) || 0;
      const baseAmount = Number(entry.credit ?? entry.amount ?? explicitDebit ?? 0) || 0;
      const credit = explicitDebit > 0 ? 0 : (Number(entry.credit ?? 0) || baseAmount);
      const debit = explicitDebit > 0 ? explicitDebit : 0;
      entries.push({
        accountId: entry.accountId,
        debit,
        credit,
        currency: (entry.currency as Currency) || fallbackCurrency,
        description: entry.description ?? entry.note ?? fallbackDescription,
        relationId: entry.relationId,
        companyId: entry.companyId,
        amount: baseAmount || credit || debit,
      });
    }
  }

  return entries.filter(e => !!e.accountId);
};

async function ensureAccountsExist(db: any, entries: JournalEntry[]) {
  const accountIds = Array.from(new Set(entries.map(e => e.accountId).filter(Boolean)));
  if (accountIds.length === 0) return;

  const collectionsToSearch = ['chart_of_accounts', 'clients', 'boxes', 'exchanges'];
  const foundIds = new Set<string>();

  for (const collectionName of collectionsToSearch) {
    const idsInCollection = accountIds.filter(id => !foundIds.has(id));
    if (idsInCollection.length === 0) continue;
    
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

export async function postJournalEntry(
  payload: PostJournalPayload,
  fa?: NormalizedFinanceAccounts
): Promise<{ voucherId: string }> {
  const db = await getDb();
  
  const actor = payload.actor;
  if (!actor) {
    throw new Error('Actor (user) is required to post journal entries.');
  }
  
  const rawEntries = Array.isArray(payload.entries) && payload.entries.length > 0
    ? payload.entries
    : buildEntriesFromLegacyPayload(payload);

  if (!rawEntries || rawEntries.length === 0) {
    throw new Error('No entries provided');
  }

  await ensureAccountsExist(db, rawEntries);

  if (!isBalanced(rawEntries)) {
    throw new Error('Entries are not balanced (debit != credit)');
  }

  const finance = fa || await getFinanceMap();

  if (finance?.preventDirectCashRevenue) {
    const cashId = finance.defaultCashId;
    if (cashId) {
      for (const e of rawEntries) {
        if (e.accountId === cashId && inferAccountCategory(e.accountId, finance || null) === 'revenue') {
             throw new Error('Direct cash posting is disabled by finance settings');
        }
      }
    }
  }

  const now = Timestamp.now();
  const voucherRef = payload.voucherId
    ? db.collection('journal-vouchers').doc(payload.voucherId)
    : db.collection('journal-vouchers').doc();

  const existingVoucherSnap = payload.voucherId ? await voucherRef.get() : null;
  const existingVoucherData = existingVoucherSnap?.exists ? existingVoucherSnap.data() as any : null;

  const sequenceId =
    resolveSequenceId(payload.sourceType)
    || resolveSequenceId(existingVoucherData?.sourceType);

  const voucherNumber = payload.invoiceNumber
    || existingVoucherData?.invoiceNumber
    || await getNextVoucherNumber(sequenceId ?? 'JE');
  const voucherCurrency = resolveCurrency(rawEntries);

  const storedEntries = rawEntries.map((entry) => {
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

  const createdBy = existingVoucherData?.createdBy || payload.meta?.createdBy || actor?.uid || 'system';
  const officer = existingVoucherData?.officer || payload.meta?.officer || actor?.name || 'system';
  
  const meta = payload.meta || {};

  const mergedMeta = payload.mergeMeta && existingVoucherData?.meta
    ? { ...existingVoucherData.meta, ...(meta || {}) }
    : (meta || null);

  const baseVoucherData: any = {
      id: voucherRef.id,
      invoiceNumber: voucherNumber,
      date: voucherDate,
      currency: resolveCurrency(rawEntries),
      notes: payload.description || '',
      createdBy,
      officer,
      createdAt: existingVoucherData?.createdAt || now,
      updatedAt: now,
      voucherType: `journal_from_${payload.sourceType}`,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      debitEntries,
      creditEntries,
      isAudited: existingVoucherData?.isAudited ?? false,
      isConfirmed: existingVoucherData?.isConfirmed ?? true,
      meta: mergedMeta,
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
        };
        if (entry.relationId) e.relationId = entry.relationId;
        if (entry.companyId) e.companyId = entry.companyId;
        return e;
      }),
      originalData: {
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        meta: mergedMeta,
      },
      isDeleted: false,
      status: payload.voucherId ? 'updated' : (existingVoucherData?.status || 'posted'),
    };

    if (payload.voucherId) {
      await voucherRef.update(baseVoucherData);
    } else {
      await voucherRef.set(baseVoucherData);
    }

  return { voucherId: voucherRef.id };
}


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

export async function postJournalEntries(payload: PostJournalPayload, fa?: NormalizedFinanceAccounts): Promise<{ voucherId: string }> {
    return postJournalEntry(payload, fa);
}

export async function postRevenue({
  invoiceNumber,
  sourceType,
  sourceId,
  date,
  currency,
  amount,
  clientId,
  description,
  meta,
}: {
  invoiceNumber?: string;
  sourceType: string;
  sourceId: string;
  date: string | Date;
  currency: Currency;
  amount: number;
  clientId: string;
  description: string;
  meta: any;
}) {
  const financeMap = await getFinanceMap();
  const revenueAccountId = financeMap.revenueMap?.[sourceType] || financeMap.generalRevenueId;
  if (!revenueAccountId) throw new Error(`Revenue account for ${sourceType} is not defined`);
  if (!financeMap.receivableAccountId) throw new Error('Accounts Receivable is not defined');

  await postJournalEntry({
    invoiceNumber,
    sourceType,
    sourceId,
    date,
    entries: [
      { accountId: clientId, debit: amount, credit: 0, currency, description, relationId: clientId },
      { accountId: revenueAccountId, debit: 0, credit: amount, currency, description },
    ],
    meta,
  });
}

export async function postCost({
  invoiceNumber,
  costKey,
  sourceType,
  sourceId,
  date,
  currency,
  amount,
  supplierId,
  description,
  meta,
}: {
  invoiceNumber?: string;
  costKey: string;
  sourceType: string;
  sourceId: string;
  date: string | Date;
  currency: Currency;
  amount: number;
  supplierId: string;
  description: string;
  meta: any;
}) {
  const financeMap = await getFinanceMap();
  const expenseAccountId = financeMap.expenseMap?.[costKey] || financeMap.generalExpenseId;
  if (!expenseAccountId) throw new Error(`Expense account for ${costKey} is not defined`);
  if (!financeMap.payableAccountId) throw new Error('Accounts Payable is not defined');

  await postJournalEntry({
    invoiceNumber,
    sourceType,
    sourceId,
    date,
    entries: [
      { accountId: expenseAccountId, debit: amount, credit: 0, currency, description },
      { accountId: supplierId, debit: 0, credit: amount, currency, description, relationId: supplierId },
    ],
    meta,
  });
}
    