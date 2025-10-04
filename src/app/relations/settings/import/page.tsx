
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, Map, List, Save } from 'lucide-react';
import { Stepper, StepperItem, useStepper } from '@/components/ui/stepper';
import { useToast } from "@/hooks/use-toast";
import ImportUpload from './components/import-upload';
import FieldMapping from './components/field-mapping';
import ImportPreviewTable from './components/import-preview-table';
import SaveImport from './components/save-import';
import type { AppSettings } from '@/lib/types';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import DynamicImportTool from './components/dynamic-import-tool';

export default function ImportPage() {
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">أداة استيراد Excel</h1>
                    <p className="text-muted-foreground">
                        اتبع الخطوات لاستيراد بيانات العملاء أو الموردين من ملف.
                    </p>
                </div>
            </div>
             <Card>
                <CardContent className="pt-6">
                   <DynamicImportTool settings={settings} />
                </CardContent>
            </Card>
        </div>
    );
}
