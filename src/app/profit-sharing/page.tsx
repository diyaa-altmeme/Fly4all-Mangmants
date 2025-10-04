

import React from 'react';
import { getMonthlyProfits, getProfitSharesForMonth } from './actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '../suppliers/actions';
import ProfitSharingContent from './components/profit-sharing-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function ProfitSharingPage() {
    const [monthlyProfits, clientsResponse, suppliers, error] = await Promise.all([
        getMonthlyProfits(),
        getClients({ all: true }),
        getSuppliers({ all: true })
    ]).then(res => [...res, null]).catch(e => [null, null, null, e.message]);
    
    if (error || !monthlyProfits || !clientsResponse || !suppliers) {
         return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات الضرورية لهذه الصفحة."}</AlertDescription>
            </Alert>
        )
    }

    const partners = [
        ...clientsResponse.clients.map(c => ({ id: c.id, name: c.name, type: 'client' as const })),
        ...suppliers.map(s => ({ id: s.id, name: s.name, type: 'supplier' as const }))
    ];
    
    const currentMonthId = format(new Date(), 'yyyy-MM');
    const initialMonthId = monthlyProfits.find(p => p.id === currentMonthId) ? currentMonthId : (monthlyProfits[0]?.id || currentMonthId);
    const initialShares = await getProfitSharesForMonth(initialMonthId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>توزيع حصص الأرباح</CardTitle>
                <CardDescription>إدارة وتوزيع حصص الأرباح بين الشركاء والمساهمين.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProfitSharingContent
                    initialMonthlyProfits={monthlyProfits}
                    initialShares={initialShares}
                    partners={partners}
                    initialMonthId={initialMonthId}
                />
            </CardContent>
        </Card>
    );
}
