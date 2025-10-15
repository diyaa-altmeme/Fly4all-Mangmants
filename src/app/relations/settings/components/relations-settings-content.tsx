
"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, SlidersHorizontal } from 'lucide-react';
import AliasesSettings from './aliases-settings';
import DynamicImportTool from '@/app/relations/settings/import/components/dynamic-import-tool';
import type { AppSettings } from '@/lib/types';

interface RelationsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function RelationsSettings({ settings, onSettingsChanged }: RelationsSettingsProps) {

    return (
        <Tabs defaultValue="fields">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields"><SlidersHorizontal className="me-2 h-4 w-4"/>إدارة الحقول</TabsTrigger>
                <TabsTrigger value="import"><FileSpreadsheet className="me-2 h-4 w-4"/>استيراد Excel</TabsTrigger>
            </TabsList>
            <TabsContent value="fields" className="mt-4">
                 <Card>
                    <CardContent className="pt-6">
                        <AliasesSettings settings={settings} onSettingsChanged={onSettingsChanged} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="import" className="mt-4">
                 <Card>
                     <CardHeader>
                        <CardTitle>أداة استيراد Excel</CardTitle>
                        <CardDescription>
                            اتبع الخطوات لاستيراد بيانات العملاء أو الموردين من ملف.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DynamicImportTool settings={settings} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
