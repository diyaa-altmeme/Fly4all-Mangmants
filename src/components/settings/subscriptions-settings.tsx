
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, SubscriptionSettings } from '@/lib/types';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Autocomplete } from '@/components/ui/autocomplete';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface SubscriptionsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function SubscriptionsSettings({ settings: initialSettings, onSettingsChanged }: SubscriptionsSettingsProps) {
    const [subSettings, setSubSettings] = useState<Partial<SubscriptionSettings>>(initialSettings.subscriptionSettings || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { data: navData, loaded: navDataLoaded } = useVoucherNav();

    useEffect(() => {
        setSubSettings(initialSettings.subscriptionSettings || {});
    }, [initialSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ subscriptionSettings: subSettings });
        if (result.success) {
            toast({ title: 'تم حفظ إعدادات الاشتراكات بنجاح' });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات.', variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleChange = (key: keyof SubscriptionSettings, value: any) => {
        setSubSettings(prev => ({ ...prev, [key]: value }));
    };

    const supplierOptions = React.useMemo(() => 
        (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })),
    [navData?.suppliers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات الاشتراكات</CardTitle>
                <CardDescription>
                    تحديد الإعدادات الافتراضية عند إنشاء اشتراك جديد لتسهيل وتسريع عملية إدخال البيانات.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>المورد الافتراضي</Label>
                         <Autocomplete 
                            options={supplierOptions} 
                            value={subSettings.defaultSupplier || ''}
                            onValueChange={(value) => handleChange('defaultSupplier', value)}
                            placeholder="اختر موردًا..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>الكمية الافتراضية</Label>
                        <NumericInput value={subSettings.defaultQuantity} onValueChange={(v) => handleChange('defaultQuantity', v || 1)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>عدد الأقساط الافتراضي</Label>
                        <NumericInput value={subSettings.defaultInstallments} onValueChange={(v) => handleChange('defaultInstallments', v || 12)} />
                    </div>
                     <div className="space-y-1.5">
                        <Label>أول قسط بعد (أيام)</Label>
                        <NumericInput value={subSettings.firstInstallmentAfterDays} onValueChange={(v) => handleChange('firstInstallmentAfterDays', v || 30)} />
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse rounded-lg border p-4 justify-between">
                        <Label htmlFor="auto-journal" className="font-semibold">إنشاء قيد محاسبي تلقائيًا</Label>
                        <Switch id="auto-journal" checked={subSettings.autoCreateJournalEntry} onCheckedChange={(c) => handleChange('autoCreateJournalEntry', c)} />
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
