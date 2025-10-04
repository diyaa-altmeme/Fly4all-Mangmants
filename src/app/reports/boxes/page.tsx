
import React, { Suspense } from 'react';
import { getBoxes } from "@/app/boxes/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from 'lucide-react';
import { getClients } from "@/app/relations/actions";
import { getSuppliers } from "@/app/suppliers/actions";
import { Skeleton } from "@/components/ui/skeleton";
import BoxReportClient from './components/box-report-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Box, Client, Supplier } from '@/lib/types';

async function BoxReportDataContainer({ initialBoxId }: { initialBoxId?: string }) {
    const [boxes, clientsResponse, suppliers, error] = await Promise.all([
        getBoxes(),
        getClients({ all: true }),
        getSuppliers({ all: true })
    ]).then(res => [...res, null]).catch(e => [null, null, null, e.message || "Failed to load report data."]);

    if (error || !boxes || !clientsResponse || !suppliers) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <BoxReportClient
            boxes={boxes}
            clients={clientsResponse.clients}
            suppliers={suppliers}
            initialBoxId={initialBoxId}
        />
    );
}

export default async function BoxReportsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const initialBoxId = searchParams?.boxId as string | undefined;

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>تقارير الصناديق</CardTitle>
                    <CardDescription>عرض وتحليل حركة الأموال لكل صندوق على حدة.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <BoxReportDataContainer initialBoxId={initialBoxId} />
                     </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
