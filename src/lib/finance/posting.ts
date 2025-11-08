

'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/lib/auth/actions";
import type { Currency, FinanceAccountsMap, JournalEntry as LegacyJournalEntry } from '@/lib/types';
import type { FinanceAccountsMap as FinanceAccountsMapType } from '@/lib/types';
import {
  normalizeFinanceAccounts,
  type NormalizedFinanceAccounts,
} from '@/lib/finance/finance-accounts';
import { Timestamp } from 'firebase-admin/firestore';
import { getNextVoucherNumber } from '@/lib/sequences';
import { inferAccountCategory } from '@/lib/finance/account-categories';
import * as admin from 'firebase-admin';
import { postJournalEntry, type PostJournalPayload, type JournalEntry } from './postJournal';


// جلب خريطة الربط من الإعدادات (كاش بسيط اختياري)
let _cache: { at: number; map: NormalizedFinanceAccounts | null } = { at: 0, map: null };

export async function getFinanceMap(): Promise<NormalizedFinanceAccounts> {
  const now = Date.now();
  if (_cache.map && now - _cache.at < 15_000) return _cache.map; // cache 15s

  const db = await getDb();
  const ref = db.collection("settings").doc("app_settings");
  const snap = await ref.get();
  const fmRaw = (snap.data()?.financeAccounts || {}) as FinanceAccountsMapType;
  const fm = normalizeFinanceAccounts(fmRaw);
  _cache = { at: now, map: fm };
  return fm;
}

// مثال: إنشاء قيد إيراد لوحدة معينة (tickets/visas/...)
export async function postRevenue({
  invoiceNumber,
  sourceType, sourceId, date, currency, amount,
  clientId, // يُحفظ بالـ meta فقط (لا ننشئ حساب فرعي)
  description,
}: {
  invoiceNumber?: string;
  sourceType: "tickets"|"visas"|"subscriptions"|"segments"|"profit_distribution";
  sourceId: string;
  date: string | Date;
  currency: string;
  amount: number;
  clientId?: string;
  description: string;
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
    invoiceNumber,
    sourceType,
    sourceId,
    date: typeof date === 'string' ? Date.parse(date) : date.getTime(),
    entries,
    meta: { clientId, directCash: !shouldDefer },
    description: description,
  }, fm);
}

// مثال: تسجيل تكلفة
export async function postCost({
  invoiceNumber,
  costKey, // cost_tickets/cost_visas/...
  sourceType, sourceId, date, currency, amount, supplierId
}: {
  invoiceNumber?: string;
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
    invoiceNumber,
    sourceType,
    sourceId,
    date: typeof date === 'string' ? Date.parse(date) : date.getTime(),
    entries,
    meta: { supplierId },
    description: 'قيد مصروف',
  }, fm);
}

const FieldPath = admin.firestore.FieldPath;

export async function postJournalEntries(payload: PostJournalPayload, fa?: NormalizedFinanceAccounts): Promise<string> {
    return postJournalEntry(payload, fa);
}


export async function recordFinancialTransaction(
  transaction: FinancialTransaction,
  options: RecordFinancialTransactionOptions = {}
): Promise<FinancialTransactionResult> {
  const actor = options.actorId
    ? { uid: options.actorId, name: options.actorName || 'system' }
    : await getCurrentUserFromSession();

  if (!actor) {
    throw new Error('User not authenticated.');
  }

  const amount = Number(transaction.amount || 0);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  if (!transaction.debitAccountId || !transaction.creditAccountId) {
    throw new Error('Both debitAccountId and creditAccountId are required.');
  }

  if (transaction.debitAccountId === transaction.creditAccountId) {
    throw new Error('Debit and credit accounts must be different.');
  }

  const description = transaction.description?.trim() || `معاملة ${transaction.sourceType}`;
  const sourceId = transaction.sourceId || transaction.id || `txn-${Date.now()}`;
  const resolvedDate = resolveDate(transaction.date);

  const unifiedMeta = sanitizeMeta({
    ...options.meta,
    reference: transaction.reference,
    companyId: transaction.companyId,
    createdBy: transaction.createdBy || actor.uid,
    unifiedTransaction: {
      amount,
      currency: transaction.currency,
      debitAccountId: transaction.debitAccountId,
      creditAccountId: transaction.creditAccountId,
    },
  });

  const voucherId = await postJournalEntry({
    sourceType: transaction.sourceType,
    sourceId,
    date: resolvedDate,
    description,
    entries: [
      {
        accountId: transaction.debitAccountId,
        debit: amount,
        credit: 0,
        currency: transaction.currency,
        relationId: transaction.companyId,
        note: description,
      },
      {
        accountId: transaction.creditAccountId,
        debit: 0,
        credit: amount,
        currency: transaction.currency,
        relationId: transaction.companyId,
        note: description,
      },
    ],
    meta: unifiedMeta,
  });

  if (!options.skipAuditLog) {
    await createAuditLog({
      userId: actor.uid,
      userName: actor.name || 'System',
      action: 'CREATE',
      targetType: options.auditTargetType || 'VOUCHER',
      targetId: options.auditTargetId || voucherId,
      description: options.auditDescription || `${description} (${amount} ${transaction.currency})`,
      reference: transaction.reference,
      sourceId,
    });
  }

  return { voucherId, sourceId };
}


const sanitizeMeta = (meta: Record<string, unknown> | undefined) => {
  if (!meta) return undefined;
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const resolveDate = (input?: string | Date) => {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export interface RecordFinancialTransactionOptions {
  actorId?: string;
  actorName?: string;
  meta?: Record<string, unknown>;
  auditDescription?: string;
  auditTargetType?: string;
  auditTargetId?: string;
  skipAuditLog?: boolean;
}

export interface FinancialTransactionResult {
  voucherId: string;
  sourceId: string;
}

export type FinancialTransaction = {
  id?: string;
  sourceType: string;
  sourceId?: string;
  date?: string | Date;
  currency: Currency;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
  companyId?: string;
  createdBy?: string;
  invoiceNumber?: string;
};
