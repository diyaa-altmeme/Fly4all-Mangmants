
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, PlusCircle, Trash2, BellRing, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, SubscriptionSettings } from '@/lib/types';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Autocomplete } from '@/components/ui/autocomplete';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';
import { produce } from 'immer';

interface SubscriptionsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

const Section = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

export default function SubscriptionsSettings({ settings: initialSettings, onSettingsChanged }: SubscriptionsSettingsProps) {
    const [subSettings, setSubSettings] = useState<Partial<SubscriptionSettings>>(initialSettings.subscriptionSettings || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const { data: navData } = useVoucherNav();

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
    
    const handleReminderChange = (index: number, value: string) => {
        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue) || numericValue < 0) return;
        
        setSubSettings(produce(draft => {
            if (!draft.reminders) draft.reminders = { enabled: true, daysBeforeDue: [], sendTime: "09:00" };
            draft.reminders.daysBeforeDue[index] = numericValue;
            // Sort to keep it tidy
            draft.reminders.daysBeforeDue.sort((a,b) => b - a);
        }));
    };
    
    const addReminderDay = () => {
         setSubSettings(produce(draft => {
            if (!draft.reminders) draft.reminders = { enabled: true, daysBeforeDue: [], sendTime: "09:00" };
            draft.reminders.daysBeforeDue.push(1);
             draft.reminders.daysBeforeDue.sort((a,b) => b - a);
        }));
    };

    const removeReminderDay = (index: number) => {
         setSubSettings(produce(draft => {
            if (draft.reminders) {
                draft.reminders.daysBeforeDue.splice(index, 1);
            }
        }));
    };
    

    const supplierOptions = React.useMemo(() => 
        (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })),
    [navData?.suppliers]);

    return (
        <div className="space-y-6">
            <Section title="الإعدادات الافتراضية" description="لتسريع عملية إضافة اشتراك جديد.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
            </Section>

            <Section title="إشعارات وتذكيرات الأقساط" description="إدارة التذكيرات التلقائية للأقساط المستحقة والمتأخرة.">
                 <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="reminders-enabled" checked={subSettings.reminders?.enabled} onCheckedChange={(c) => handleChange('reminders', {...subSettings.reminders, enabled: c})} />
                    <Label htmlFor="reminders-enabled" className="font-semibold text-base">تفعيل إرسال التذكيرات التلقائية</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <div>
                        <Label className="font-semibold flex items-center gap-2 mb-2"><BellRing className="h-4 w-4"/>أيام التذكير (قبل الاستحقاق)</Label>
                        <div className="space-y-2">
                            {(subSettings.reminders?.daysBeforeDue || []).map((day, index) => (
                                <div key={index} className="flex items-center gap-2">
                                     <span className="text-sm">إرسال تذكير قبل</span>
                                     <NumericInput className="w-20 h-8" value={day} onValueChange={(v) => handleReminderChange(index, String(v))} />
                                     <span className="text-sm">أيام</span>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeReminderDay(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addReminderDay}><PlusCircle className="me-2 h-4 w-4"/>إضافة يوم تذكير</Button>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div>
                            <Label htmlFor="sendTime" className="font-semibold flex items-center gap-2 mb-2"><Clock className="h-4 w-4"/>وقت إرسال التذكيرات</Label>
                            <Input id="sendTime" type="time" value={subSettings.reminders?.sendTime || '09:00'} onChange={e => handleChange('reminders', {...subSettings.reminders, sendTime: e.target.value})} className="w-40"/>
                        </div>
                         <div>
                            <Label htmlFor="overdueDays" className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4"/>إشعارات التأخير</Label>
                            <div className="flex items-center gap-2">
                                 <span className="text-sm">إرسال إشعار تأخير بعد</span>
                                 <NumericInput className="w-20 h-8" value={subSettings.reminders?.notifyAfterOverdueDays} onValueChange={v => handleChange('reminders', {...subSettings.reminders, notifyAfterOverdueDays: v || 1})} />
                                 <span className="text-sm">أيام من الاستحقاق</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
            
             <Section title="الإعدادات المحاسبية" description="تحديد حسابات الربط مع شجرة الحسابات.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label>حساب إيراد الاشتراكات</Label>
                         <Autocomplete 
                            searchAction="all"
                            value={subSettings.revenueAccountId || ''}
                            onValueChange={(value) => handleChange('revenueAccountId', value)}
                            placeholder="اختر حساب الإيراد..."
                        />
                    </div>
                     <div className="space-y-1.5">
                        <Label>حساب تكلفة الاشتراكات</Label>
                         <Autocomplete 
                            searchAction="all"
                            value={subSettings.costAccountId || ''}
                            onValueChange={(value) => handleChange('costAccountId', value)}
                            placeholder="اختر حساب التكلفة..."
                        />
                    </div>
                </div>
            </Section>

            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات
                </Button>
            </div>
        </div>
    );
}
