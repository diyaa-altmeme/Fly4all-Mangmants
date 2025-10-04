
import React, { Suspense } from 'react';
import { getExchangesDashboardData, getExchanges } from '../actions';
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
            <Card>
                <CardHeader>
                    <CardTitle>لوحة تحكم البورصات</CardTitle>
                    <CardDescription>
                        نظرة شاملة ومباشرة على جميع أرصدة البورصات وآخر الحركات المسجلة.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <DashboardDataContainer />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
