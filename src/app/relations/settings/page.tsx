'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, MessageSquareQuote } from 'lucide-react';
import Link from 'next/link';
import { useSettingsNavigation } from './use-settings-navigation';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FieldsSettings from './fields/fields-settings';
import AliasesSettings from './aliases/aliases-settings';
import CreditPolicySettings from './credit-policy/credit-policy-settings';
import ImportSettings from './import/import-settings';


function RelationsSettingsPageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>إعدادات العلاقات</CardTitle>
                <CardDescription>
                    التحكم الكامل في جميع الجوانب المتعلقة بالعملاء والموردين، من الحقول المخصصة إلى سياسات الاستيراد والدفع.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="fields">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="fields">إدارة الحقول</TabsTrigger>
                        <TabsTrigger value="import">الاستيراد والتصدير</TabsTrigger>
                        <TabsTrigger value="aliases">المرادفات</TabsTrigger>
                        <TabsTrigger value="creditPolicy">سياسات الآجل</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fields" className="mt-4">
                        <FieldsSettings relationSections={initialSettings.relationSections} onSettingsChanged={onSettingsChanged} />
                    </TabsContent>
                    <TabsContent value="import" className="mt-4">
                        <ImportSettings settings={initialSettings} />
                    </TabsContent>
                    <TabsContent value="aliases" className="mt-4">
                        <AliasesSettings settings={initialSettings} onSettingsChanged={onSettingsChanged} />
                    </TabsContent>
                    <TabsContent value="creditPolicy" className="mt-4">
                        <CreditPolicySettings settings={initialSettings} onSettingsChanged={onSettingsChanged} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}


export default function RelationsSettingsPage() {
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
        return <Skeleton className="h-[600px] w-full" />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الإعدادات."}</AlertDescription>
            </Alert>
        );
    }

    return <RelationsSettingsPageContent initialSettings={settings} onSettingsChanged={fetchData} />;
}
