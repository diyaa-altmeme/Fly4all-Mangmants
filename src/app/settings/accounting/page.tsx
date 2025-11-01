
"use client";
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { getChartOfAccounts } from './chart-of-accounts/actions';
import { getFinanceAccountsMap } from './actions';
import { getSettings } from '@/app/settings/actions';
import AccountingClient from './components/accounting-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { AppSettings, FinanceAccountsMap, TreeNode, User, Box, Client, Supplier, Exchange } from '@/lib/types';
import ProtectedPage from '@/components/auth/protected-page';

function AccountingDataContainer() {
    const [chartData, setChartData] = useState<TreeNode[]>([]);
    const [financeMap, setFinanceMap] = useState<FinanceAccountsMap | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [chart, fMap, appSettings] = await Promise.all([
                getChartOfAccounts(),
                getFinanceAccountsMap(),
                getSettings(),
            ]);
            setChartData(chart);
            setFinanceMap(fMap);
            setSettings(appSettings);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    if (error || !chartData || !settings || !financeMap) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return (
        <AccountingClient 
            initialChartData={chartData} 
            initialFinanceMap={financeMap}
            initialSettings={settings}
        />
    )
}


export default function ChartOfAccountsMainPage() {
    return (
        <ProtectedPage requiredPermission="settings:finance:manage">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">📘 الدليل المحاسبي والربط المالي</h1>
                    <p className="text-muted-foreground">
                        إدارة شجرة الحسابات وربط الحسابات المحاسبية الرئيسية بالعمليات التلقائية في النظام.
                    </p>
                </div>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <AccountingDataContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
