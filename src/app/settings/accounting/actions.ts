
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode, FinanceAccountsMap } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getFinanceAccounts as getFinanceAccountsMapFromAdvanced, saveFinanceAccounts as updateFinanceAccountsMapFromAdvanced } from '../advanced-accounts-setup/actions';


const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

export async function getFinanceAccountsMap(): Promise<FinanceAccountsMap | null> {
    return await getFinanceAccountsMapFromAdvanced();
}

export async function updateFinanceAccountsMap(payload: FinanceAccountsMap) {
    return await updateFinanceAccountsMapFromAdvanced(payload);
}
