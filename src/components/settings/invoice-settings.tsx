
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, InvoiceThemeSettings } from '@/lib/types';
import { Textarea } from '../ui/textarea';

interface InvoiceSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function InvoiceSettings({ settings: initialSettings, onSettingsChanged }: InvoiceSettingsProps) {
    const [invoiceSettings, setInvoiceSettings] = useState<Partial<InvoiceThemeSettings>>(initialSettings.theme?.invoice || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setInvoiceSettings(initialSettings.theme?.invoice || {});
    }, [initialSettings]);

    const handleChange = (key: keyof InvoiceThemeSettings, value: string) => {
        setInvoiceSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ theme: { ...initialSettings.theme, invoice: invoiceSettings } });
        if (result.success) {
            toast({ title: "تم حفظ إعدادات الفاتورة بنجاح" });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات.', variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات الفواتير والتقارير المطبوعة</CardTitle>
                <CardDescription>
                    تخصيص معلومات الشركة التي تظهر في رأس وتذييل الفواتير والتقارير عند طباعتها.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>اسم الشركة</Label>
                        <Input value={invoiceSettings.companyName || ''} onChange={(e) => handleChange('companyName', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>رقم الهاتف</Label>
                        <Input value={invoiceSettings.companyPhone || ''} onChange={(e) => handleChange('companyPhone', e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label>عنوان الشركة</Label>
                        <Input value={invoiceSettings.companyAddress || ''} onChange={(e) => handleChange('companyAddress', e.target.value)} />
                    </div>
                     <div className="space-y-1.5 md:col-span-2">
                        <Label>الموقع الإلكتروني</Label>
                        <Input value={invoiceSettings.companyWeb || ''} onChange={(e) => handleChange('companyWeb', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>لون ترويسة الجدول</Label>
                         <Input type="color" value={invoiceSettings.headerColor || '#f3f4f6'} onChange={(e) => handleChange('headerColor', e.target.value)} className="p-1 h-10"/>
                    </div>
                     <div className="space-y-1.5">
                        <Label>لون عنوان الفاتورة</Label>
                        <Input type="color" value={invoiceSettings.titleColor || '#333333'} onChange={(e) => handleChange('titleColor', e.target.value)} className="p-1 h-10"/>
                    </div>
                     <div className="space-y-1.5 md:col-span-2">
                        <Label>نص التذييل</Label>
                        <Textarea value={invoiceSettings.footerText || ''} onChange={(e) => handleChange('footerText', e.target.value)} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4"/>
                    حفظ الإعدادات
                </Button>
            </CardFooter>
        </Card>
    );
}
