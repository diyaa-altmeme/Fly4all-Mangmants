
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { getDebtsReportData, DebtsReportEntry } from '@/app/reports/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import DebtsReport from '@/components/reports/debts-report';
import ProtectedPage from '@/components/auth/protected-page';

function DebtsReportContainer() {
    const [reportData, setReportData] = useState<DebtsReportEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDebtsReportData();
            setReportData(data.entries);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    return <DebtsReport initialData={reportData || []} onDataChanged={fetchData}/>;
}

export default function DebtsReportPage() {
  return (
    <ProtectedPage requiredPermission="reports:debts">
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <DebtsReportContainer />
        </Suspense>
    </ProtectedPage>
  );
}
