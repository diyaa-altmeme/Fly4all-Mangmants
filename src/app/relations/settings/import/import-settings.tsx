
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, FileJson, ArrowLeft, Bot } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ImportJsonTool from './components/import-json-tool';
import type { AppSettings } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DynamicImportTool from './components/dynamic-import-tool';

const ToolRow = ({ icon: Icon, title, description, children }: { icon: React.ElementType, title: string, description: string, children: React.ReactNode }) => (
    <TableRow>
        <TableCell>
            <div className="flex items-center gap-4">
                <Icon className="h-8 w-8 text-primary" />
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
        </TableCell>
        <TableCell className="text-left">
            {children}
        </TableCell>
    </TableRow>
);


interface ImportSettingsProps {
  settings: AppSettings;
}

export default function ImportSettings({ settings }: ImportSettingsProps) {
    return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">الاستيراد والتصدير</h2>
                    <p className="text-sm text-muted-foreground">أدوات لإدخال البيانات دفعة واحدة من ملفات خارجية.</p>
                </div>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>أدوات الاستيراد</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الأداة</TableHead>
                                    <TableHead className="text-left">إجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 <ToolRow
                                    icon={Bot}
                                    title="استيراد العلاقات من Excel"
                                    description="استيراد العملاء والموردين مع ربط تلقائي ويدوي لجميع الحقول المعرفة في النظام."
                                >
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button>فتح أداة الاستيراد <ArrowLeft className="ms-2 h-4 w-4"/></Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>أداة استيراد علاقات من Excel</DialogTitle>
                                                <DialogDescription>اتبع الخطوات لاستيراد بياناتك. هذه الأداة تستخدم أحدث إعدادات الحقول لديك.</DialogDescription>
                                            </DialogHeader>
                                            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                                                <DynamicImportTool settings={settings} />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </ToolRow>
                                <ToolRow
                                    icon={FileJson}
                                    title="استيراد شامل (JSON)"
                                    description="استيراد أنواع متعددة من البيانات من ملف JSON واحد."
                                >
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary">فتح الأداة <ArrowLeft className="ms-2 h-4 w-4"/></Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>أداة استيراد JSON الشاملة</DialogTitle>
                                                <DialogDescription>ارفع ملف JSON، اختر الأقسام، ثم قم بمعاينتها وحفظها.</DialogDescription>
                                            </DialogHeader>
                                            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                                                <ImportJsonTool />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </ToolRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
