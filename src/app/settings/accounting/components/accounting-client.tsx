
"use client";

import React from 'react';
import type { AppSettings, FinanceAccountsMap, TreeNode } from '@/lib/types';
import AccountingPage from './AccountingPage';

/**
 * This is a client boundary component. 
 * It receives server-side fetched data as props and passes them down to the actual page component.
 * This pattern is useful for keeping the main page logic in a component that can be reused or tested independently.
 */

interface AccountingClientProps {
  initialSettings: AppSettings;
  initialChartData: TreeNode[];
  initialFinanceMap: FinanceAccountsMap;
}

export default function AccountingSettingsClient(props: AccountingClientProps) {
  // The main logic is now within AccountingPage
  return <AccountingPage {...props} />;
}
