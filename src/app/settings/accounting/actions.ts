
'use server';

import { getFinanceAccounts as getFinanceAccountsMapFromAdvanced, saveFinanceAccounts as updateFinanceAccountsMapFromAdvanced } from '../advanced-accounts-setup/actions';
import { normalizeFinanceAccounts, serializeFinanceAccounts, type NormalizedFinanceAccounts, type FinanceAccountsInput } from '@/lib/finance/finance-accounts';

export async function getFinanceAccountsMap(): Promise<NormalizedFinanceAccounts | null> {
    const raw = await getFinanceAccountsMapFromAdvanced();
    if (!raw) return null;
    return normalizeFinanceAccounts(raw);
}

export async function updateFinanceAccountsMap(payload: FinanceAccountsInput) {
    return await updateFinanceAccountsMapFromAdvanced(serializeFinanceAccounts(payload));
}
