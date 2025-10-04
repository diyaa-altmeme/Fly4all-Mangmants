

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfitsDashboard from './components/profits-dashboard';
import { getMonthlyProfits } from '../profit-sharing/actions';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';


export default async function ProfitsPage() {
    const [monthlyProfits, error] = await getMonthlyProfits().then(res => [res, null]).catch(e => [null, e.message]);
    
    if (error || !monthlyProfits) {
        return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل بيانات الأرباح."}</AlertDescription>
            </Alert>
        )
    }

    const currentMonthId = format(new Date(), 'yyyy-MM');
   
    return (
        <Card>
            <CardHeader>
                <CardTitle>الأرباح الإجمالية</CardTitle>
                <CardDescription>
                    حساب وعرض الأرباح الشهرية الإجمالية من مختلف المصادر.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ProfitsDashboard
                    initialMonthId={currentMonthId}
                    savedProfits={monthlyProfits}
                />
            </CardContent>
        </Card>
    );
}
