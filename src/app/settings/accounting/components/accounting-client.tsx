
"use client";

import React, { useState, useCallback } from 'react';
import type { TreeNode } from '@/lib/types';
import FinanceAccountSettings from '@/app/settings/accounting/components/FinanceAccountSettings';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { getChartOfAccounts } from '@/app/settings/accounting/chart-of-accounts/actions';
import AccountsTreeClient from '../chart-of-accounts/components/accounts-tree-client';
import type { NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitBranch, WalletCards } from 'lucide-react';

interface AccountingClientProps {
  initialChartData: TreeNode[];
  initialFinanceMap: NormalizedFinanceAccounts;
  onSettingsChanged: () => void;
}

export default function AccountingClient(props: AccountingClientProps) {
  const [chartData, setChartData] = useState<TreeNode[]>(props.initialChartData);
  const { toast } = useToast();

  const refreshChartData = useCallback(async () => {
    try {
      const data = await getChartOfAccounts();
      setChartData(data);
      toast({ title: "تم تحديث شجرة الحسابات" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  }, [toast]);
  
  const handleSettingsSaved = () => {
    toast({ title: "تم حفظ إعدادات الربط بنجاح" });
    props.onSettingsChanged();
  };

  return (
    <Tabs defaultValue="linking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="linking" className="gap-2">
                <WalletCards className="h-4 w-4"/>
                الربط المالي
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
                <GitBranch className="h-4 w-4"/>
                الدليل المحاسبي
            </TabsTrigger>
        </TabsList>
        <TabsContent value="linking">
             <Card>
                <CardContent className="pt-6">
                    <FinanceAccountSettings
                        initialFinanceMap={props.initialFinanceMap}
                        chartOfAccounts={chartData}
                        onSaveSuccess={handleSettingsSaved}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="chart">
             <AccountsTreeClient
                initialAccounts={chartData}
                onAccountsUpdated={setChartData}
            />
        </TabsContent>
    </Tabs>
  );
}
