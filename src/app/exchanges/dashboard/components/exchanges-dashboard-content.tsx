
'use client';

import React, { useState, useEffect } from 'react';
import { getExchangesDashboardData, type ExchangeDashboardData } from '../../actions';
import { ExchangeCard } from './exchange-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Exchange } from '@/lib/types';

interface ExchangesDashboardContentProps {
    initialExchanges: ExchangeDashboardData[];
    allExchanges: Exchange[];
}

export default function ExchangesDashboardContent({ initialExchanges, allExchanges }: ExchangesDashboardContentProps) {
    const [exchanges, setExchanges] = useState(initialExchanges);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const refreshData = async () => {
        setLoading(true);
        try {
            const data = await getExchangesDashboardData();
            setExchanges(data);
            toast({ title: "تم تحديث البيانات" });
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={refreshData} disabled={loading} variant="outline">
                    {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
                    تحديث البيانات
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {exchanges.map(exchange => (
                    <ExchangeCard key={exchange.id} exchange={exchange} exchanges={allExchanges} onRefresh={refreshData} />
                ))}
                {exchanges.length === 0 && !loading && (
                    <p className="text-muted-foreground text-center col-span-full py-12">لا توجد بورصات لعرضها.</p>
                )}
            </div>
        </div>
    );
}
