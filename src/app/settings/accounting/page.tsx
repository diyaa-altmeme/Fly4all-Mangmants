
import React from 'react';
import Link from 'next/link';
import { getChartOfAccounts } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import AdvancedAccountsSetupPage from '../advanced-accounts-setup/page';

export default async function AccountingSettingsPage() {
    const [chartData, error] = await getChartOfAccounts().then(res => [res, null]).catch(e => [null, e.message]);
    const settings = await getSettings();

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
