'use server';

import React from 'react';
import { getChartOfAccounts } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import ProtectedPage from '@/components/auth/protected-page';


async function AccountingSettingsContainer() {
    const [chartData, error] = await getChartOfAccounts()
        .then(data => [data, null])
        .catch(err => [null, err.message]);

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return <ChartOfAccountsTree data={chartData || []} />;
}

export default function AccountingSettingsPage() {
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
                    <React.Suspense fallback={<p>جاري تحميل شجرة الحسابات...</p>}>
                        <AccountingSettingsContainer />
                    </React.Suspense>
                </CardContent>
            </Card>
        </ProtectedPage>
    );
}
