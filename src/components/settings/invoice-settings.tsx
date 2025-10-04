
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, InvoiceThemeSettings } from '@/lib/types';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

const SectionCard = ({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) => (
    <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

const ColorInput = ({ label, value, onChange }: { label: string, value?: string, onChange: (value: string) => void }) => {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <div className="relative">
                <Input value={value || ''} onChange={e => onChange(e.target.value)} className="pr-12" />
                <div 
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1 bg-transparent border-none cursor-pointer rounded-md"
                    style={{ backgroundColor: value }}
                >
                    <Input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                </div>
            </div>
        </div>
    );
};


interface InvoiceSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function InvoiceSettings({ settings: initialSettings, onSettingsChanged }: InvoiceSettingsProps) {
    const [settings, setSettings] = useState<Partial<InvoiceThemeSettings>>(initialSettings.theme?.invoice || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        setSettings(initialSettings.theme?.invoice || {});
    }, [initialSettings]);
    
    if (!settings) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    const handleChange = (key: keyof InvoiceThemeSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ theme: { ...initialSettings.theme, invoice: settings } });
        if(result.success) {
            toast({ title: "تم حفظ إعدادات الفاتورة بنجاح" });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: "لم يتم حفظ الإعدادات.", variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <SectionCard 
                title="معلومات الشركة" 
                description="البيانات التي ستظهر في رأس وتذييل الفاتورة."
            >
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>اسم الشركة</Label><Input value={settings.companyName || ''} onChange={(e) => handleChange('companyName', e.target.value)}/></div>
                    <div className="space-y-1.5"><Label>عنوان الشركة</Label><Input value={settings.companyAddress || ''} onChange={(e) => handleChange('companyAddress', e.target.value)}/></div>
                    <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input value={settings.companyPhone || ''} onChange={(e) => handleChange('companyPhone', e.target.value)}/></div>
                    <div className="space-y-1.5"><Label>الموقع الإلكتروني</Label><Input value={settings.companyWeb || ''} onChange={(e) => handleChange('companyWeb', e.target.value)}/></div>
                 </div>
            </SectionCard>
            
            <SectionCard 
                title="التصميم والألوان" 
                description="تخصيص المظهر البصري للفاتورة."
            >
                <div className="grid md:grid-cols-2 gap-4">
                    <ColorInput label="لون الهيدر" value={settings.headerColor} onChange={(v) => handleChange('headerColor', v)} />
                    <ColorInput label="لون عنوان الفاتورة" value={settings.titleColor} onChange={(v) => handleChange('titleColor', v)} />
                </div>
            </SectionCard>

            <SectionCard 
                title="محتوى التذييل" 
                description="إضافة ملاحظات أو شروط وأحكام في أسفل الفاتورة."
            >
                <div className="space-y-1.5">
                    <Label>نص التذييل</Label>
                    <Textarea value={settings.footerText || ''} onChange={(e) => handleChange('footerText', e.target.value)} rows={4}/>
                </div>
            </SectionCard>


            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات
                </Button>
            </div>
        </div>
    );
}

