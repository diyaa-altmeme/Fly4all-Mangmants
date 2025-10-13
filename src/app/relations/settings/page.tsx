
'use client';

import React from 'react';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Users, SlidersHorizontal, Upload, MessageSquareQuote, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, Shield, FileText, Terminal as DeveloperIcon, Paintbrush, FileBarChart, Banknote } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import FieldsSettings from './fields/fields-settings';
import AliasesSettings from './aliases/aliases-settings';
import CreditPolicySettings from './credit-policy/credit-policy-settings';
import ImportSettings from './import/import-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';


function RelationsSettingsPageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات العلاقات</CardTitle>
                <CardDescription>
                    إدارة شاملة لكل ما يتعلق بالعملاء والموردين، من الحقول المخصصة وسياسات الدفع إلى أدوات الاستيراد.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="fields" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="fields"><SlidersHorizontal className="me-2 h-4 w-4"/>إدارة الحقول</TabsTrigger>
                        <TabsTrigger value="import"><Upload className="me-2 h-4 w-4"/>الاستيراد والتصدير</TabsTrigger>
                        <TabsTrigger value="aliases"><MessageSquareQuote className="me-2 h-4 w-4"/>مرادفات الاستيراد</TabsTrigger>
                        <TabsTrigger value="credit_policy"><CreditCard className="me-2 h-4 w-4"/>سياسات الآجل</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fields" className="mt-6">
                        <FieldsSettings relationSections={initialSettings.relationSections} onSettingsChanged={onSettingsChanged} />
                    </TabsContent>
                    <TabsContent value="import" className="mt-6">
                        <ImportSettings settings={initialSettings} />
                    </TabsContent>
                    <TabsContent value="aliases" className="mt-6">
                        <AliasesSettings settings={initialSettings} onSettingsChanged={onSettingsChanged} />
                    </TabsContent>
                    <TabsContent value="credit_policy" className="mt-6">
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
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Skeleton className="h-[400px] w-full lg:col-span-2" />
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
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

    