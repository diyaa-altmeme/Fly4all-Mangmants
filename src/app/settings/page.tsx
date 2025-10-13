
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getSettings } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Users, SlidersHorizontal, Upload, MessageSquareQuote, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, Shield, FileText, GitBranch, Briefcase } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettings from '@/app/relations/settings/page';
import AppearanceSettings from './themes/page';

const sections = [
    { id: 'appearance', name: 'المظهر', icon: Palette, component: AppearanceSettings },
    { id: 'accounting', name: 'المحاسبة', icon: GitBranch, component: AccountingSettings },
    { id: 'relations', name: 'العلاقات', icon: Users, component: RelationsSettings },
    { id: 'hr', name: 'الموظفين', icon: Briefcase, href: '/users' },
    { id: 'integrations', name: 'الربط الخارجي', icon: Link2, component: ApiSettings },
    { id: 'system', name: 'النظام والحالة', icon: Database, component: SystemStatusSettings },
];

function SettingsPageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>الإعدادات العامة</CardTitle>
                <CardDescription>
                    تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="appearance" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-6">
                        {sections.map(section => (
                            <TabsTrigger key={section.id} value={section.id} asChild={!!section.href}>
                                {section.href ? (
                                    <Link href={section.href}><section.icon className="me-2 h-4 w-4"/>{section.name}</Link>
                                ) : (
                                    <><section.icon className="me-2 h-4 w-4"/>{section.name}</>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {sections.filter(s => s.component).map(section => {
                         const Component = section.component!;
                         return (
                            <TabsContent value={section.id} className="mt-6" key={section.id}>
                                <Component settings={initialSettings} onSettingsChanged={onSettingsChanged} />
                            </TabsContent>
                         )
                    })}
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = useCallback(async () => {
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


    return (
        <div className="space-y-6">
             <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                <p className="text-muted-foreground">
                    تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                </p>
            </div>
             {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start p-4">
                    <Skeleton className="h-[600px] w-full lg:col-span-2" />
                </div>
            ) : error ? (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>حدث خطأ!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : settings ? (
                <SettingsPageContent initialSettings={settings} onSettingsChanged={fetchData} />
            ) : null}
        </div>
    );
}
