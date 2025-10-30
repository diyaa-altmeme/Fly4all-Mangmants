
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getChartOfAccounts, getFinanceAccountsMap } from '@/app/settings/accounting/actions';
import { getSettings } from '@/app/settings/actions';
import AccountingPage from './components/AccountingPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { AppSettings, FinanceAccountsMap, TreeNode } from '@/lib/types';
import ProtectedPage from '@/components/auth/protected-page';

function AccountingDataContainer() {
    const [chartData, setChartData] = React.useState<TreeNode[]>([]);
    const [financeMap, setFinanceMap] = React.useState<FinanceAccountsMap>({});
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [chartDataRes, financeMapRes, settingsRes] = await Promise.all([
                    getChartOfAccounts(),
                    getFinanceAccountsMap(),
                    getSettings(),
                ]);
                setChartData(chartDataRes);
                setFinanceMap(financeMapRes);
                setSettings(settingsRes);
            } catch (e: any) {
                setError(e.message || "Failed to load accounting data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <AccountingPage 
            initialChartData={chartData} 
            initialFinanceMap={financeMap}
            initialSettings={settings!}
        />
    )
}


export default function ChartOfAccountsMainPage() {
    return (
        <ProtectedPage requiredPermission="settings:read">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الدليل المحاسبي والربط المالي</h1>
                    <p className="text-muted-foreground">
                        إدارة شجرة الحسابات وربط الحسابات المحاسبية الرئيسية بالعمليات التلقائية في النظام.
                    </p>
                </div>
                 <Card>
                    <CardContent className="pt-6">
                        <AccountingDataContainer />
                    </CardContent>
                </Card>
            </div>
        </ProtectedPage>
    );
}
