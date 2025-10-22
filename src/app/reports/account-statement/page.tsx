"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import type { Box, Client, Supplier, Exchange } from '@/lib/types';
import { getBoxes } from '@/app/boxes/actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import ReportGenerator from '@/components/reports/report-generator';
import { useSearchParams } from 'next/navigation';
import { getExchanges } from '@/app/exchanges/actions';

function AccountStatementContainer() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ boxes: Box[], clients: Client[], suppliers: Supplier[], exchanges: Exchange[] } | null>(null);
    const searchParams = useSearchParams();
    const accountId = searchParams.get('accountId') || undefined;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [boxes, clientsResponse, suppliers, exchangesResult] = await Promise.all([
                getBoxes(),
                getClients({ all: true }),
                getSuppliers({ all: true }),
                getExchanges(),
            ]);
            if (exchangesResult.error || !exchangesResult.accounts) {
                throw new Error(exchangesResult.error || "Failed to load exchanges.");
            }
            setData({ boxes, clients: clientsResponse.clients, suppliers, exchanges: exchangesResult.accounts });
        } catch (e: any) {
            setError(e.message || "Failed to load report data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Skeleton className="h-[calc(100vh-120px)] w-full" />;
    }

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل البيانات."}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <ReportGenerator
            boxes={data.boxes}
            clients={data.clients}
            suppliers={data.suppliers}
            exchanges={data.exchanges}
            defaultAccountId={accountId}
        />
    );
}

export default function AccountStatementPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[calc(100vh-120px)] w-full" />}>
            <AccountStatementContainer />
        </Suspense>
    );
}
