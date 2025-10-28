

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { getSettings } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import SettingsPageContent from './components/settings-page-content';

export default function SettingsPage() {
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

    return (
        <div className="space-y-6">
             <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                <p className="text-muted-foreground">
                    تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                </p>
            </div>
             {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start p-4">
                    <Skeleton className="h-[600px] w-full" />
                    <Skeleton className="h-[600px] w-full" />
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
