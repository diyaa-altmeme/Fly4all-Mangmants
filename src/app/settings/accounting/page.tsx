
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getChartOfAccounts } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';
import AccountingSettingsContent from './components/accounting-settings-content';
import type { TreeNode } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountingSettingsPage() {
    const [chartData, setChartData] = useState<TreeNode[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getChartOfAccounts();
            setChartData(data);
        } catch(e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <Skeleton className="w-full h-96" />;
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
        <ProtectedPage permission="settings:finance:manage">
            <Card>
                <CardHeader>
                    <CardTitle>الدليل المحاسبي</CardTitle>
                    <CardDescription>
                        استعراض وتحليل شجرة الحسابات الكاملة للنظام، والتي تشمل الأصول، الخصوم، الإيرادات، والمصروفات.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AccountingSettingsContent initialChartData={chartData || []} />
                </CardContent>
            </Card>
        </ProtectedPage>
    );
}
