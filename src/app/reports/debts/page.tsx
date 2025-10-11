
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { getDebtsReportData, DebtsReportEntry } from '@/app/reports/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import DebtsReport from '@/components/reports/debts-report';

function DebtsReportContainer() {
    const [reportData, setReportData] = useState<DebtsReportEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getDebtsReportData()
            .then(data => setReportData(data.entries))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
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

    return <DebtsReport initialData={reportData || []} />;
}


export default function DebtsReportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <DebtsReportContainer />
    </Suspense>
  );
}
