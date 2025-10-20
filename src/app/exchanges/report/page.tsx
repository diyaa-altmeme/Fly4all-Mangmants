
'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import ExchangeManager from '../components/ExchangeManager';
import { getExchanges } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams } from 'next/navigation';
import type { Exchange } from '@/lib/types';

function ExchangeManagerLoader() {
    const searchParams = useSearchParams();
    const initialExchangeId = searchParams.get('exchangeId') || '';

    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchData = useCallback(() => {
        setLoading(true);
        getExchanges()
            .then(result => {
                if (result.error || !result.accounts) {
                    throw new Error(result.error || "Failed to load exchanges.");
                }
                setExchanges(result.accounts);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if(loading) {
         return (
             <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
         )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    return <ExchangeManager initialExchanges={exchanges} initialExchangeId={initialExchangeId}/>;
}


export default function ExchangeReportPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="space-y-6">
            <Card><CardHeader><CardTitle>إدارة البورصات والمعاملات</CardTitle></CardHeader></Card>
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
        </div>
      }>
        <ExchangeManagerLoader />
      </Suspense>
    </div>
  );
}
