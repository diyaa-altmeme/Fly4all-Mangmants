
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { getChartOfAccounts } from './chart-of-accounts/actions';
import { getFinanceAccountsMap } from './actions';
import FinanceAccountSettings from './components/FinanceAccountSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { TreeNode } from '@/lib/types';
import type { NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';

function FinanceSettingsContainer() {
    const [chartOfAccounts, setChartOfAccounts] = useState<TreeNode[]>([]);
    const [financeMap, setFinanceMap] = useState<NormalizedFinanceAccounts | null>(null);
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
        <Card>
            <CardContent className="pt-6">
                <FinanceAccountSettings
                    initialFinanceMap={financeMap}
                    chartOfAccounts={chartOfAccounts}
                    onSaveSuccess={fetchData}
                />
            </CardContent>
        </Card>
    )
}

export default function AccountingSettingsPage() {
    return (
        <ProtectedPage requiredPermission="settings:finance:manage">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الربط المالي</h1>
                    <p className="text-muted-foreground">
                        إدارة وربط الحسابات المحاسبية الرئيسية بالعمليات التلقائية في النظام.
                    </p>
                </div>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <FinanceSettingsContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
