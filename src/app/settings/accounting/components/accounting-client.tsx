
"use client";

import React, { useState, useCallback } from 'react';
import type { AppSettings, FinanceAccountsMap, TreeNode } from '@/lib/types';
import { getChartOfAccounts } from '../actions';
import ChartOfAccountsTree from './chart-of-accounts-tree';
import AddAccountDialog from './add-account-dialog';
import FinanceAccountSettings from './FinanceAccountSettings';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountingClientProps {
  initialChartData: TreeNode[];
  initialFinanceMap: FinanceAccountsMap;
  initialSettings: AppSettings;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">شجرة الحسابات</h2>
                <div className="flex items-center gap-2">
                    <AddAccountDialog allAccounts={chartData} onAccountAdded={refreshChartData}>
                        <Button variant="outline" size="sm" disabled={loading}>
                            <PlusCircle className="me-2 h-4 w-4" />
                            إضافة حساب
                        </Button>
                    </AddAccountDialog>
                     <Button variant="outline" size="sm" onClick={refreshChartData} disabled={loading}>
                        <RefreshCw className="me-2 h-4 w-4" />
                        تحديث
                    </Button>
                </div>
            </div>
            {loading ? <Skeleton className="h-[400px]" /> : <ChartOfAccountsTree data={chartData} />}
        </div>
        <div>
            <h2 className="text-xl font-bold mb-4">ربط الحسابات المالية</h2>
            <FinanceAccountSettings 
                initialFinanceMap={props.initialFinanceMap} 
                chartOfAccounts={chartData} 
                initialSettings={props.initialSettings} 
            />
        </div>
    </div>
  );
}
