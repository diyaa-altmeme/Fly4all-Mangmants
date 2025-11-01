
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import type { AppSettings, FinanceAccountsMap, TreeNode, User, Box, Client, Supplier, Exchange } from '@/lib/types';
import AccountFormDialog from '@/app/settings/accounting/chart-of-accounts/components/account-form';
import FinanceAccountSettings from '@/app/settings/accounting/components/FinanceAccountSettings';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, GitBranch, WalletCards } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getChartOfAccounts } from '@/app/settings/accounting/chart-of-accounts/actions';
import AccountsTreeClient from '../chart-of-accounts/components/accounts-tree-client';

interface AccountingClientProps {
  initialChartData: TreeNode[];
  initialFinanceMap: FinanceAccountsMap;
  initialSettings: AppSettings;
}

const NavButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <Button 
        variant={active ? "secondary" : "ghost"}
        className="w-full justify-start gap-2 font-semibold"
        onClick={onClick}
    >
        {children}
    </Button>
);

export default function AccountingClient(props: AccountingClientProps) {
  const [chartData, setChartData] = useState<TreeNode[]>(props.initialChartData);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'chart' | 'linking'>('chart');
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
    // Re-fetch might be needed if settings affect chart data display
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px,1fr] gap-6 items-start">
        <aside className="lg:sticky top-20">
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">أقسام المحاسبة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2">
                    <NavButton active={activeView === 'chart'} onClick={() => setActiveView('chart')}>
                        <GitBranch className="h-5 w-5" />
                        الدليل المحاسبي
                    </NavButton>
                    <NavButton active={activeView === 'linking'} onClick={() => setActiveView('linking')}>
                         <WalletCards className="h-5 w-5" />
                        ربط الحسابات
                    </NavButton>
                </CardContent>
            </Card>
        </aside>
        
        <main>
            {activeView === 'chart' && (
                <AccountsTreeClient initialAccounts={chartData} />
            )}

            {activeView === 'linking' && (
                <Card>
                    <CardHeader>
                        <CardTitle>ربط الحسابات المالية</CardTitle>
                        <CardDescription>
                            اربط حسابات النظام الرئيسية بالحسابات الفعلية في شجرة الحسابات لضمان التوجيه المحاسبي الصحيح.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FinanceAccountSettings 
                            initialFinanceMap={props.initialFinanceMap} 
                            chartOfAccounts={chartData} 
                            initialSettings={props.initialSettings}
                            onSaveSuccess={handleSettingsSaved}
                        />
                    </CardContent>
                </Card>
            )}
        </main>
    </div>
  );
}

