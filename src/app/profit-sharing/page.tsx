
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getMonthlyProfits } from './actions';
import { getClients } from '@/app/relations/actions';
import ProfitSharingContent from './components/profit-sharing-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import type { Client, MonthlyProfit } from '@/lib/types';
import { produce } from 'immer';
import { useRouter } from 'next/navigation';

export default function ProfitSharingPage() {
    const [monthlyProfits, setMonthlyProfits] = useState<MonthlyProfit[]>([]);
    const [partners, setPartners] = useState<{ id: string; name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [profits, clientsResponse] = await Promise.all([
                getMonthlyProfits(),
                getClients({ all: true }),
            ]);

            const partnerList = clientsResponse.clients.map(c => ({ 
                id: c.id, 
                name: c.name, 
                type: c.relationType 
            }));
            setPartners(partnerList);

            const enrichedMonthlyProfits = produce(profits, draft => {
                draft.forEach(period => {
                    if (!period.fromSystem && period.partners) {
                        period.partners.forEach(share => {
                            const partner = partnerList.find(p => p.id === share.partnerId);
                            if (partner) {
                                share.partnerName = partner.name;
                            }
                        });
                    }
                });
            });
            setMonthlyProfits(enrichedMonthlyProfits);

        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

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
        <ProfitSharingContent
            initialMonthlyProfits={monthlyProfits}
            partners={partners}
            onDataChange={fetchData}
        />
    );
}
