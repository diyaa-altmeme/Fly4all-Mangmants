
"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { TreeNode, FinanceAccountsMap, AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getChartOfAccounts } from '../actions';
import ChartOfAccountsTree from './chart-of-accounts-tree';
import AddAccountDialog from './add-account-dialog';
import FinanceAccountSettings from './FinanceAccountSettings';

interface AccountingPageProps {
  initialChartData: TreeNode[];
  initialFinanceMap: FinanceAccountsMap;
  initialSettings: AppSettings;
}

export default function AccountingPage({ initialChartData, initialFinanceMap, initialSettings }: AccountingPageProps) {
  const [chartData, setChartData] = useState<TreeNode[]>(initialChartData);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshChartData = async () => {
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
  };

  return (
    <Tabs defaultValue="chart_of_accounts">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="chart_of_accounts">الدليل المحاسبي</TabsTrigger>
          <TabsTrigger value="advanced_settings">إعدادات الحسابات المالية</TabsTrigger>
        </TabsList>
        <AddAccountDialog allAccounts={chartData} onAccountAdded={refreshChartData}>
          <Button disabled={loading}>
            <PlusCircle className="me-2 h-4 w-4" />
            إضافة حساب جديد
          </Button>
        </AddAccountDialog>
      </div>

      <TabsContent value="chart_of_accounts">
        {loading ? <p>جاري التحميل...</p> : <ChartOfAccountsTree data={chartData} />}
      </TabsContent>

      <TabsContent value="advanced_settings">
        <FinanceAccountSettings 
            initialFinanceMap={initialFinanceMap} 
            chartOfAccounts={chartData} 
            initialSettings={initialSettings} 
        />
      </TabsContent>
    </Tabs>
  );
}
