

"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import ReportGenerator from '@/app/reports/account-statement/components/report-generator';

function AccountStatementContent() {
    const searchParams = useSearchParams();
    const defaultAccountId = searchParams.get('accountId') || '';
    
    // This component now solely focuses on rendering the ReportGenerator
    // It assumes the necessary data (boxes, clients, etc.) is provided by a context or fetched inside ReportGenerator
    
    // For now, let's assume ReportGenerator fetches its own data or uses a context
    // and we don't need to pass props down from here.
    return <ReportGenerator defaultAccountId={defaultAccountId} />;
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
