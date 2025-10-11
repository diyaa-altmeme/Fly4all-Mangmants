
import React from 'react';
import { getMonthlyProfits, getProfitSharesForMonth } from './actions';
import { getClients } from '@/app/relations/actions';
import ProfitSharingContent from './components/profit-sharing-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { Client, MonthlyProfit } from '@/lib/types';
import { produce } from 'immer';

export const dynamic = 'force-dynamic';

export default async function ProfitSharingPage() {
    const [monthlyProfits, clientsResponse, error] = await Promise.all([
        getMonthlyProfits(),
        getClients({ all: true }),
    ]).then(res => [...res, null]).catch(e => [null, null, e.message]);
    
    if (error || !monthlyProfits || !clientsResponse) {
         return (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات الضرورية لهذه الصفحة."}</AlertDescription>
            </Alert>
        )
    }

    const partners = clientsResponse.clients.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.relationType 
    }));
    
    // Enrich shares with partner names for manual entries
    const enrichedMonthlyProfits = produce(monthlyProfits, draft => {
        draft.forEach(period => {
            if (!period.fromSystem && period.partners) {
                period.partners.forEach(share => {
                    const partner = partners.find(p => p.id === share.partnerId);
                    if (partner) {
                        share.partnerName = partner.name;
                    }
                });
            }
        });
    });

    return (
        <ProfitSharingContent
            initialMonthlyProfits={enrichedMonthlyProfits}
            partners={partners}
        />
    );
}
