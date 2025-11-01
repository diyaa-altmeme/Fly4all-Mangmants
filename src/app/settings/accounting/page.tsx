
import React, { Suspense } from 'react';
import { getChartOfAccounts } from './chart-of-accounts/actions';
import { getFinanceAccountsMap } from './actions';
import { getSettings } from '@/app/settings/actions';
import AccountingClient from './components/accounting-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { AppSettings, FinanceAccountsMap, TreeNode } from '@/lib/types';
import ProtectedPage from '@/components/auth/protected-page';
import { useVoucherNav } from '@/context/voucher-nav-context';

async function AccountingDataContainer() {
    const [chartData, financeMap, settings, error] = await Promise.all([
        getChartOfAccounts(),
        getFinanceAccountsMap(),
        getSettings(),
    ]).then(res => [...res, null]).catch(e => [null, null, null, e.message || "Failed to load data"]);
    
    if (error || !chartData || !settings || !financeMap) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }
    
    const { data } = useVoucherNav();

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
        <ProtectedPage requiredPermission="settings:read">
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
