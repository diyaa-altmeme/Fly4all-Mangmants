
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UsersIcon, ListOrdered, Settings, GitBranch, MessageSquareQuote, Loader2, Banknote, Repeat, ChevronsRightLeft } from 'lucide-react';
import type { AppSettings, TreeNode } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getChartOfAccounts } from '@/app/reports/actions';
import { useToast } from '@/hooks/use-toast';
import ChartOfAccountsTree from '@/components/settings/chart-of-accounts-tree';
import ExchangeRateTemplateDialog from '@/components/settings/exchange-rate-template-dialog';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ExchangeSettings from './exchange-settings';


interface AccountingSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

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


export default function AccountingSettings({ settings, onSettingsChanged }: AccountingSettingsProps) {
    return (
        <div className="space-y-4">
            <Tabs defaultValue="chart_of_accounts">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="chart_of_accounts">شجرة الحسابات</TabsTrigger>
                    <TabsTrigger value="invoice_sequences">تسلسل الفواتير</TabsTrigger>
                    <TabsTrigger value="currencies">العملات</TabsTrigger>
                    <TabsTrigger value="subscriptions">الاشتراكات</TabsTrigger>
                    <TabsTrigger value="exchanges">البورصات</TabsTrigger>
                </TabsList>
                <TabsContent value="chart_of_accounts" className="mt-4">
                   <ChartOfAccountsTabContent />
                </TabsContent>
                <TabsContent value="invoice_sequences" className="mt-4">
                     <InvoiceSequencesPage />
                </TabsContent>
                 <TabsContent value="currencies" className="mt-4">
                    <CurrencySettings settings={settings} onSettingsChanged={onSettingsChanged} />
                </TabsContent>
                 <TabsContent value="subscriptions" className="mt-4">
                    <SubscriptionsSettings settings={settings} onSettingsChanged={onSettingsChanged} />
                </TabsContent>
                <TabsContent value="exchanges" className="mt-4">
                    <ExchangeSettings />
                </TabsContent>
           </Tabs>
        </div>
    );
}
