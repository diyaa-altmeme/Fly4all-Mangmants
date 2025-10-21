
import React from 'react';
import ExchangesDashboardContent from './components/exchanges-dashboard-content';
import { getExchangesDashboardData, getExchanges } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function ExchangesDashboardPage() {
    const [dashboardData, exchangesResult, error] = await Promise.all([
        getExchangesDashboardData(),
        getExchanges(),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message || "فشل تحميل البيانات"]);
    
    if (error) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>ملخص البورصات</CardTitle>
                    <CardDescription>
                        نظرة شاملة على أرصدة جميع البورصات مع إمكانية الوصول السريع للعمليات.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ExchangesDashboardContent 
                        initialExchanges={dashboardData || []} 
                        allExchanges={exchangesResult?.accounts || []} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
