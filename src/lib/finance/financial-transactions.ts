
'use server';

import { postJournalEntry } from '@/lib/finance/postJournal';
import { createAuditLog } from '@/app/system/activity-log/actions';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import type { FinancialTransaction } from '@/lib/types';
import { getNextVoucherNumber } from '../sequences';

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
    invoiceNumber: transaction.invoiceNumber,
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
    entries: (
      options.meta?.entries || [
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
      ]
    ),
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
