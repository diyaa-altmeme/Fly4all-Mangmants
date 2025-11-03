
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { getChartOfAccounts } from './chart-of-accounts/actions';
import { getFinanceAccountsMap } from './actions';
import AccountingClient from './components/accounting-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GitBranch, WalletCards } from 'lucide-react';

function AccountingDataContainer() {
    const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
    const [financeMap, setFinanceMap] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [chartData, financeMapData] = await Promise.all([
                getChartOfAccounts(),
                getFinanceAccountsMap(),
            ]);
            setChartOfAccounts(chartData);
            setFinanceMap(financeMapData);
        } catch (e: any) {
            setError(e.message || "Failed to load accounting settings");
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

    if (error || !financeMap || !chartOfAccounts) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || 'فشل تحميل البيانات المحاسبية.'}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <AccountingClient 
            initialFinanceMap={financeMap}
            initialChartData={chartOfAccounts}
            onSettingsChanged={fetchData}
        />
    )
}

export default function AccountingSettingsPage() {
    return (
        <ProtectedPage requiredPermission="settings:finance:manage">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">📘 الإعدادات المحاسبية والمالية</h1>
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
