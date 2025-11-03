
"use client";

import React, { useState, useCallback } from 'react';
import type { TreeNode } from '@/lib/types';
import FinanceAccountSettings from '@/app/settings/accounting/components/FinanceAccountSettings';
import { Button } from '@/components/ui/button';
import { RefreshCw, GitBranch, WalletCards } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getChartOfAccounts } from '@/app/settings/accounting/chart-of-accounts/actions';
import AccountsTreeClient from '../chart-of-accounts/components/accounts-tree-client';
import type { NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';

interface AccountingClientProps {
  initialChartData: TreeNode[];
  initialFinanceMap: NormalizedFinanceAccounts;
  onSettingsChanged: () => void;
}

export default function AccountingClient(props: AccountingClientProps) {
  const [chartData, setChartData] = useState<TreeNode[]>(props.initialChartData);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshChartData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChartOfAccounts();
      setChartData(data);
      toast({ title: "تم تحديث شجرة الحسابات" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const handleSettingsSaved = () => {
    toast({ title: "تم حفظ إعدادات الربط بنجاح" });
    props.onSettingsChanged();
  };

  return (
    <div className="space-y-6">
        <FinanceAccountSettings
            initialFinanceMap={props.initialFinanceMap}
            chartOfAccounts={chartData}
            onSaveSuccess={handleSettingsSaved}
        />
    </div>
  );
}
