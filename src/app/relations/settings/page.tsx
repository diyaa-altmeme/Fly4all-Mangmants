
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Terminal } from "lucide-react";
import Link from 'next/link';
import { getSettings } from '@/app/settings/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RelationsSettings from './components/relations-settings-content';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppSettings } from '@/lib/types';


export default function RelationsSettingsPage() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedSettings = await getSettings();
            setSettings(fetchedSettings);
        } catch (e: any) {
            setError(e.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (error || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || 'فشل تحميل الإعدادات.'}</AlertDescription>
            </Alert>
        );
    }

    return (
        <RelationsSettings settings={settings} onSettingsChanged={fetchData} />
    );
}

