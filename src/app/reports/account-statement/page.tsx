
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { getClients } from '@/app/relations/actions';
import { getBoxes } from '@/app/boxes/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import { getExchanges } from '@/app/exchanges/actions';
import ReportGenerator from '@/app/reports/account-statement/components/report-generator';

function AccountStatementContent() {
    const searchParams = useSearchParams();
    const defaultAccountId = searchParams.get('accountId') || '';
    
    const [data, setData] = React.useState<{
        boxes: any[],
        clients: any[],
        suppliers: any[],
        exchanges: any[],
    } | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [clientsRes, boxesRes, suppliersRes, exchangesRes] = await Promise.all([
                    getClients({ all: true }),
                    getBoxes(),
                    getSuppliers({ all: true }),
                    getExchanges(),
                ]);

                setData({
                    clients: clientsRes.clients,
                    boxes: boxesRes,
                    suppliers: suppliersRes,
                    exchanges: exchangesRes.accounts || []
                });

            } catch (e: any) {
                setError(e.message || "فشل في تحميل البيانات اللازمة");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <Skeleton className="h-[600px] w-full" />;
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
    
    return (
        <ReportGenerator 
            boxes={data?.boxes || []}
            clients={data?.clients || []}
            suppliers={data?.suppliers || []}
            exchanges={data?.exchanges || []}
            defaultAccountId={defaultAccountId}
        />
    )
}


export default function AccountStatementPage() {
    return (
        <div className="space-y-6">
            <CardHeader className="px-0 sm:px-6">
                <CardTitle>كشف الحساب</CardTitle>
                <CardDescription>
                    عرض وتحليل جميع الحركات المالية لحساب محدد ضمن فترة زمنية.
                </CardDescription>
            </CardHeader>
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                <AccountStatementContent />
            </Suspense>
        </div>
    )
}
