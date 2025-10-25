
"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import ReportGenerator from '@/app/reports/account-statement/components/report-generator';
import { useVoucherNav } from '@/context/voucher-nav-context';
import type { Box, Client, Supplier, Exchange } from '@/lib/types';


function AccountStatementContent() {
    const searchParams = useSearchParams();
    const defaultAccountId = searchParams.get('accountId') || '';
    const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
    
    useEffect(() => {
        if (!navLoaded) {
            fetchData();
        }
    }, [navLoaded, fetchData]);

    if (!navLoaded || !navData) {
        return (
             <div className="p-4">
                <Skeleton className="h-[60vh] w-full" />
             </div>
        );
    }

    return (
        <ReportGenerator 
            defaultAccountId={defaultAccountId}
            boxes={navData.boxes || []}
            clients={navData.clients || []}
            suppliers={navData.suppliers || []}
            exchanges={navData.exchanges || []}
        />
    );
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

    