
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UsersIcon, ListOrdered, Settings, GitBranch, MessageSquareQuote, Loader2, Banknote, Repeat, ChevronsRightLeft, Shield } from 'lucide-react';
import type { AppSettings, TreeNode } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getChartOfAccounts } from './actions';
import { useToast } from '@/hooks/use-toast';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ExchangeSettings from '@/app/settings/sections/exchange-settings';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from '@/components/ui/skeleton';


const ChartOfAccountsTabContent = () => {
    const [data, setData] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        getChartOfAccounts()
            .then(setData)
            .catch(err => {
                console.error(err);
                setError("فشل تحميل شجرة الحسابات. قد يكون هناك مشكلة في الاتصال بقاعدة البيانات.");
                toast({
                    title: "خطأ",
                    description: "فشل تحميل شجرة الحسابات.",
                    variant: "destructive"
                });
            })
            .finally(() => setLoading(false));
    }, [toast]);
    
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
                <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5"/>الدليل المحاسبي</CardTitle>
                <CardDescription>
                    استعراض وتحليل شجرة الحسابات الكاملة للنظام، والتي تشمل الأصول، الخصوم، الإيرادات، والمصروفات.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <ChartOfAccountsTree data={data} />
                )}
            </CardContent>
        </Card>
    );
}

function AccountingSettingsPageContainer() {
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

     const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (e: any) {
            setError(e.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading || !settings) {
        return <Skeleton className="h-[600px] w-full" />
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
        <div className="space-y-4">
            <Tabs defaultValue="chart_of_accounts">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="chart_of_accounts">شجرة الحسابات</TabsTrigger>
                    <TabsTrigger value="invoice_sequences">تسلسل الفواتير</TabsTrigger>
                    <TabsTrigger value="currencies">العملات</TabsTrigger>
                    <TabsTrigger value="subscriptions">الاشتراكات</TabsTrigger>
                    <TabsTrigger value="client_permissions">صلاحيات العملاء</TabsTrigger>
                </TabsList>
                <TabsContent value="chart_of_accounts" className="mt-4">
                   <ChartOfAccountsTabContent />
                </TabsContent>
                <TabsContent value="invoice_sequences" className="mt-4">
                     <InvoiceSequencesPage />
                </TabsContent>
                 <TabsContent value="currencies" className="mt-4">
                    <CurrencySettings settings={settings} onSettingsChanged={fetchData} />
                </TabsContent>
                 <TabsContent value="subscriptions" className="mt-4">
                    <SubscriptionsSettings settings={settings} onSettingsChanged={fetchData} />
                </TabsContent>
                 <TabsContent value="client_permissions" className="mt-4">
                    <ClientPermissionsPage />
                </TabsContent>
           </Tabs>
        </div>
    );
}

export default function AccountingSettingsPage() {
    return (
        <React.Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <AccountingSettingsPageContainer />
        </React.Suspense>
    )
}
