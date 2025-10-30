import React, { Suspense } from 'react';
import { getChartOfAccounts } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import AccountsTreeClient from './components/accounts-tree-client';

async function ChartOfAccountsDataContainer() {
    const [accounts, error] = await getChartOfAccounts()
        .then(res => [res, null])
        .catch(e => [null, e.message || "فشل تحميل البيانات"]);
    
    if (error || !accounts) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return <AccountsTreeClient initialAccounts={accounts} />
}

export default function ChartOfAccountsPage() {
    return (
        <ProtectedPage requiredPermission="settings:read">
             <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">📘 الدليل المحاسبي</h1>
                    <p className="text-muted-foreground">
                        إدارة شجرة الحسابات وهيكل المحاسبة في النظام.
                    </p>
                </div>
                <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <ChartOfAccountsDataContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
