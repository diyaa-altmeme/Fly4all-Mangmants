
import React, { Suspense } from 'react';
import { getExchangesDashboardData, getExchanges } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ExchangesDashboardContent from './components/exchanges-dashboard-content';

async function DashboardDataContainer() {
    const [data, exchangesResult, error] = await Promise.all([
        getExchangesDashboardData(),
        getExchanges(),
    ]).then(([dashboardData, exchangesRes]) => [dashboardData, exchangesRes, null]).catch(e => [null, null, e.message || "Failed to load dashboard data."]);

    if (error || !data || !exchangesResult?.accounts) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "Failed to load necessary data."}</AlertDescription>
            </Alert>
        );
    }
    
    return <ExchangesDashboardContent initialExchanges={data} allExchanges={exchangesResult.accounts} />;
}


export default function ExchangesDashboardPage() {
    return (
        <div className="space-y-6">
            <CardHeader className="px-0 sm:px-6">
                <CardTitle>لوحة تحكم البورصات</CardTitle>
                <CardDescription>
                    نظرة شاملة ومباشرة على جميع أرصدة البورصات وآخر الحركات المسجلة.
                </CardDescription>
            </CardHeader>
            <Card>
                <CardContent className="pt-6">
                    <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"><Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" /></div>}>
                        <DashboardDataContainer />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
