import type { FinanceAccountsMap } from '@/lib/types';

const sanitize = (value?: string | null): string => (value ?? '').trim();

const ensureKeys = (
  source: Record<string, string | undefined>,
  defaults: string[]
): Record<string, string> => {
  const keys = Array.from(new Set([...defaults, ...Object.keys(source || {})]));
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = sanitize(source?.[key]);
    return acc;
  }, {});
};

const firstNonEmptyValue = (map: Record<string, string>): string => {
  return Object.values(map).find(v => v.length > 0) || '';
};

export const DEFAULT_REVENUE_KEYS = [
  'tickets',
  'visas',
  'subscriptions',
  'segments',
  'profit_distribution',
  'other',
];

export const DEFAULT_EXPENSE_KEYS = [
  'tickets',
  'visas',
  'subscriptions',
  'partners',
  'operating',
  'cost_tickets',
  'cost_visas',
  'operating_salaries',
  'operating_rent',
  'operating_utilities',
  'marketing',
];

export type NormalizedFinanceAccounts = {
  receivableAccountId: string;
  payableAccountId: string;
  hybridRelationAccountId: string;
  clearingAccountId: string;
  defaultCashId: string;
  defaultBankId: string;
  arAccountId: string;
  apAccountId: string;
  generalRevenueId: string;
  generalExpenseId: string;
  preventDirectCashRevenue: boolean;
  revenueMap: Record<string, string>;
  expenseMap: Record<string, string>;
};

export function normalizeFinanceAccounts(map?: FinanceAccountsMap | null): NormalizedFinanceAccounts {
  const revenueSources = {
    ...(map?.revenueMap || {}),
    ...(map?.customRevenues || {}),
  } as Record<string, string | undefined>;

  const expenseSources = {
    ...(map?.expenseMap || {}),
    ...(map?.customExpenses || {}),
  } as Record<string, string | undefined>;

  const revenueMap = ensureKeys(revenueSources, DEFAULT_REVENUE_KEYS);
  const expenseMap = ensureKeys(expenseSources, DEFAULT_EXPENSE_KEYS);

  const receivable = sanitize(map?.receivableAccountId || map?.arAccountId);
  const payable = sanitize(map?.payableAccountId || map?.apAccountId);

  const generalRevenue = sanitize(map?.generalRevenueId) || firstNonEmptyValue(revenueMap);
  const generalExpense = sanitize(map?.generalExpenseId) || firstNonEmptyValue(expenseMap);

  return {
    receivableAccountId: receivable,
    payableAccountId: payable,
    hybridRelationAccountId: sanitize(map?.hybridRelationAccountId),
    clearingAccountId: sanitize(map?.clearingAccountId),
    defaultCashId: sanitize(map?.defaultCashId),
    defaultBankId: sanitize(map?.defaultBankId),
    arAccountId: receivable,
    apAccountId: payable,
    generalRevenueId: generalRevenue,
    generalExpenseId: generalExpense,
    preventDirectCashRevenue: !!map?.preventDirectCashRevenue,
    revenueMap,
    expenseMap,
  };
}

export type FinanceAccountsInput = {
  receivableAccountId?: string;
  payableAccountId?: string;
  hybridRelationAccountId?: string;
  clearingAccountId?: string;
  defaultCashId?: string;
  defaultBankId?: string;
  generalRevenueId?: string;
  generalExpenseId?: string;
  preventDirectCashRevenue?: boolean;
  revenueMap?: Record<string, string | undefined>;
  expenseMap?: Record<string, string | undefined>;
};

export function serializeFinanceAccounts(input: FinanceAccountsInput): FinanceAccountsMap {
  const revenueMap = ensureKeys(input.revenueMap || {}, DEFAULT_REVENUE_KEYS);
  const expenseMap = ensureKeys(input.expenseMap || {}, DEFAULT_EXPENSE_KEYS);

  const receivable = sanitize(input.receivableAccountId);
  const payable = sanitize(input.payableAccountId);

  const generalRevenue = sanitize(input.generalRevenueId) || firstNonEmptyValue(revenueMap);
  const generalExpense = sanitize(input.generalExpenseId) || firstNonEmptyValue(expenseMap);

  return {
    receivableAccountId: receivable,
    payableAccountId: payable,
    hybridRelationAccountId: sanitize(input.hybridRelationAccountId),
    clearingAccountId: sanitize(input.clearingAccountId),
    defaultCashId: sanitize(input.defaultCashId),
    defaultBankId: sanitize(input.defaultBankId),
    preventDirectCashRevenue: !!input.preventDirectCashRevenue,
    generalRevenueId: generalRevenue,
    generalExpenseId: generalExpense,
    arAccountId: receivable,
    apAccountId: payable,
    revenueMap,
    customRevenues: revenueMap,
    expenseMap,
    customExpenses: expenseMap,
  } as FinanceAccountsMap;
}
