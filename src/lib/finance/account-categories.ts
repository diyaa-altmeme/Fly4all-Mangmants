import type { NormalizedFinanceAccounts } from './finance-accounts';

export type AccountCategory =
  | 'cash'
  | 'bank'
  | 'client'
  | 'supplier'
  | 'hybrid'
  | 'revenue'
  | 'expense'
  | 'clearing'
  | 'other';

const matches = (accountId?: string | null, target?: string | null): boolean => {
  if (!accountId || !target) return false;
  const cleanAccount = accountId.trim();
  const cleanTarget = target.trim();
  if (!cleanAccount || !cleanTarget) return false;
  return (
    cleanAccount === cleanTarget ||
    cleanAccount.startsWith(`${cleanTarget}-`) ||
    cleanAccount.startsWith(`${cleanTarget}.`) ||
    cleanAccount.startsWith(`${cleanTarget}/`) ||
    cleanAccount.startsWith(cleanTarget)
  );
};

const matchesAny = (accountId: string | undefined, targets: Iterable<string | undefined>): boolean => {
  for (const target of targets) {
    if (matches(accountId, target)) {
      return true;
    }
  }
  return false;
};

export function inferAccountCategory(
  accountId?: string,
  finance?: NormalizedFinanceAccounts | null
): AccountCategory {
  if (!accountId) return 'other';
  if (!finance) return 'other';

  const {
    defaultCashId,
    defaultBankId,
    receivableAccountId,
    arAccountId,
    payableAccountId,
    apAccountId,
    hybridRelationAccountId,
    clearingAccountId,
    revenueMap,
    expenseMap,
    generalRevenueId,
    generalExpenseId,
  } = finance;

  if (matches(accountId, defaultCashId)) return 'cash';
  if (matches(accountId, defaultBankId)) return 'bank';
  if (matches(accountId, hybridRelationAccountId)) return 'hybrid';
  if (matches(accountId, receivableAccountId) || matches(accountId, arAccountId)) return 'client';
  if (matches(accountId, payableAccountId) || matches(accountId, apAccountId)) return 'supplier';
  if (matches(accountId, clearingAccountId)) return 'clearing';

  const revenueTargets = [generalRevenueId, ...Object.values(revenueMap || {})];
  if (matchesAny(accountId, revenueTargets)) return 'revenue';

  const expenseTargets = [generalExpenseId, ...Object.values(expenseMap || {})];
  if (matchesAny(accountId, expenseTargets)) return 'expense';

  return 'other';
}

export function isRevenueAccount(
  accountId?: string,
  finance?: NormalizedFinanceAccounts | null
): boolean {
  return inferAccountCategory(accountId, finance) === 'revenue';
}

export function isExpenseAccount(
  accountId?: string,
  finance?: NormalizedFinanceAccounts | null
): boolean {
  return inferAccountCategory(accountId, finance) === 'expense';
}

export type VoucherEntryInput = {
  entries?: any[];
  debitEntries?: any[];
  creditEntries?: any[];
};

export type NormalizedVoucherEntry = {
  accountId: string;
  debit: number;
  credit: number;
  amount: number;
  description?: string;
  currency?: string;
  relationId?: string;
  companyId?: string;
  accountType: AccountCategory;
  type: 'debit' | 'credit';
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function enrichVoucherEntries(
  voucher: VoucherEntryInput,
  finance?: NormalizedFinanceAccounts | null
): NormalizedVoucherEntry[] {
  if (Array.isArray(voucher.entries) && voucher.entries.length > 0) {
    return voucher.entries.map((entry: any): NormalizedVoucherEntry => {
      const debit = toNumber(entry.debit ?? (entry.type === 'debit' ? entry.amount : 0));
      const credit = toNumber(entry.credit ?? (entry.type === 'credit' ? entry.amount : 0));
      const amount = debit > 0 ? debit : credit;
      const accountType = (entry.accountType as AccountCategory | undefined) ||
        inferAccountCategory(entry.accountId, finance);

      return {
        accountId: entry.accountId,
        debit,
        credit,
        amount,
        description: entry.description ?? entry.note,
        currency: entry.currency,
        relationId: entry.relationId,
        companyId: entry.companyId,
        accountType,
        type: debit > 0 ? 'debit' : 'credit',
      };
    });
  }

  const normalized: NormalizedVoucherEntry[] = [];

  if (Array.isArray(voucher.debitEntries)) {
    for (const entry of voucher.debitEntries) {
      const amount = toNumber(entry.amount ?? entry.debit);
      normalized.push({
        accountId: entry.accountId,
        debit: amount,
        credit: 0,
        amount,
        description: entry.description,
        currency: entry.currency,
        relationId: entry.relationId,
        companyId: entry.companyId,
        accountType: inferAccountCategory(entry.accountId, finance),
        type: 'debit',
      });
    }
  }

  if (Array.isArray(voucher.creditEntries)) {
    for (const entry of voucher.creditEntries) {
      const amount = toNumber(entry.amount ?? entry.credit);
      normalized.push({
        accountId: entry.accountId,
        debit: 0,
        credit: amount,
        amount,
        description: entry.description,
        currency: entry.currency,
        relationId: entry.relationId,
        companyId: entry.companyId,
        accountType: inferAccountCategory(entry.accountId, finance),
        type: 'credit',
      });
    }
  }

  return normalized;
}
