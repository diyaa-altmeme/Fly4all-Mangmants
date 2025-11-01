
import { Suspense } from 'react';
import { getChartOfAccounts } from './chart-of-accounts/actions';
import { getFinanceAccountsMap } from './actions';
import AccountingClient from './components/accounting-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';

async function AccountingDataContainer() {
    try {
        const [chartData, financeMap] = await Promise.all([
            getChartOfAccounts(),
            getFinanceAccountsMap(),
        ]);

        if (!chartData || !financeMap) {
            return (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>حدث خطأ!</AlertTitle>
                    <AlertDescription>تعذر تحميل بيانات المحاسبة.</AlertDescription>
                </Alert>
            );
        }

        return (
            <AccountingClient
                initialChartData={chartData}
                initialFinanceMap={financeMap}
            />
        );
    } catch (error: any) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error?.message ?? 'حدث خطأ غير متوقع أثناء تحميل البيانات.'}</AlertDescription>
            </Alert>
        );
    }
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
                    {/* @ts-expect-error Async Server Component */}
                    <AccountingDataContainer />
                </Suspense>
            </div>
        </ProtectedPage>
    );
}
