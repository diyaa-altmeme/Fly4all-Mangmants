
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import type { Box, Client, Supplier } from '@/lib/types';
import { getBoxes } from '@/app/boxes/actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import ReportGenerator from '@/components/reports/report-generator';
import { useSearchParams } from 'next/navigation';

function InvoicesReportDataContainer() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ boxes: Box[], clients: Client[], suppliers: Supplier[] } | null>(null);
    const searchParams = useSearchParams();
    const accountId = searchParams.get('accountId') || undefined;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [boxes, clientsResponse, suppliers] = await Promise.all([
                    getBoxes(),
                    getClients({ all: true }),
                    getSuppliers({ all: true }),
                ]);
                setData({ boxes, clients: clientsResponse.clients, suppliers });
            } catch (e: any) {
                setError(e.message || "Failed to load report data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
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
            defaultAccountId={accountId}
        />
    );
}

export default function AccountStatementPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <InvoicesReportDataContainer />
        </Suspense>
    );
}
