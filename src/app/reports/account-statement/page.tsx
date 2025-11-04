
"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Terminal } from "lucide-react";
import ReportGenerator from '@/app/reports/account-statement/components/report-generator';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AccountStatementPage() {
    const searchParams = useSearchParams();
    const defaultAccountId = searchParams.get('accountId') || '';
    const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
    
    useEffect(() => {
        if (!navLoaded) {
            fetchData();
        }
    }, [navLoaded, fetchData]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>كشف الحساب</CardTitle>
                    <CardDescription>
                        المركز المالي الموحد للنظام؛ راقب كل العمليات النقدية والحسابية من مكان واحد مع إمكانية التحليل والتدقيق التفصيلي.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!navLoaded || !navData ? (
                        <div className="p-4">
                            <Skeleton className="h-[60vh] w-full" />
                        </div>
                    ) : (
                        <ReportGenerator 
                            defaultAccountId={defaultAccountId}
                            boxes={navData.boxes || []}
                            clients={navData.clients || []}
                            suppliers={navData.suppliers || []}
                            exchanges={navData.exchanges || []}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
