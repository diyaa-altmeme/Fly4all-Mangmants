
"use client";

import React, { useState, useEffect } from 'react';
import ExchangesTable from '@/app/exchanges/components/exchanges-table';
import { getExchanges } from '@/app/exchanges/actions';
import type { Exchange } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExchangeSettings() {
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        getExchanges().then(result => {
            if (result.accounts) {
                setExchanges(result.accounts);
            } else {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            }
        }).finally(() => setLoading(false));
    }, [toast]);
    
    if (loading) {
        return <Skeleton className="h-64 w-full" />
    }

    return (
        <ExchangesTable initialExchanges={exchanges} />
    )
}
