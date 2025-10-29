"use client";

import React, { useState, useEffect } from 'react';
import { getChartOfAccounts } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountingSettingsPage() {
    const [chartData, setChartData] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getChartOfAccounts();
                setChartData(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>الدليل المحاسبي</CardTitle>
                <CardDescription>
                    استعراض وتحليل شجرة الحسابات الكاملة للنظام، والتي تشمل الأصول، الخصوم، الإيرادات، والمصروفات.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartOfAccountsTree data={chartData || []} />
            </CardContent>
        </Card>
    );
}