
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, PlusCircle, Trash2, BellRing, Clock, AlertTriangle, Settings, UserCheck, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, SubscriptionSettings } from '@/lib/types';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Autocomplete } from '@/components/ui/autocomplete';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '../ui/switch';
import { produce } from 'immer';
import { Separator } from '../ui/separator';

interface SubscriptionsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-5 w-5"/>الإعدادات الافتراضية</CardTitle>
                        <CardDescription>لتسريع عملية إضافة اشتراك جديد.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-1.5">
                            <Label className="font-bold">المورد الافتراضي</Label>
                             <Autocomplete 
                                options={supplierOptions} 
                                value={subSettings.defaultSupplier || ''}
                                onValueChange={(value) => handleChange('defaultSupplier', value)}
                                placeholder="اختر موردًا..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="font-bold">الكمية الافتراضية</Label>
                                <NumericInput value={subSettings.defaultQuantity} onValueChange={(v) => handleChange('defaultQuantity', v || 1)} />
                            </div>
                             <div className="space-y-1.5">
                                <Label className="font-bold">عدد الأقساط الافتراضي</Label>
                                <NumericInput value={subSettings.defaultInstallments} onValueChange={(v) => handleChange('defaultInstallments', v || 12)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><BellRing className="h-5 w-5"/>إشعارات وتذكيرات الأقساط</CardTitle>
                        <CardDescription>إدارة التذكيرات التلقائية للأقساط المستحقة والمتأخرة.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor="reminders-enabled" className="font-semibold text-sm">تفعيل إرسال التذكيرات التلقائية</Label>
                            <Switch id="reminders-enabled" checked={subSettings.reminders?.enabled} onCheckedChange={(c) => handleChange('reminders', {...subSettings.reminders, enabled: c})} />
                        </div>
                        <div className="space-y-3">
                            <Label className="font-semibold flex items-center gap-2 text-sm"><Clock className="h-4 w-4"/>توقيتات التذكير</Label>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="sendTime" className="text-xs shrink-0">وقت الإرسال:</Label>
                                <Input id="sendTime" type="time" value={subSettings.reminders?.sendTime || '09:00'} onChange={e => handleChange('reminders', {...subSettings.reminders, sendTime: e.target.value})} className="h-8"/>
                            </div>
                             <div className="space-y-2">
                                {(subSettings.reminders?.daysBeforeDue || []).map((day, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                         <span className="text-xs">تذكير قبل</span>
                                         <NumericInput className="w-20 h-8" value={day} onValueChange={(v) => handleReminderChange(index, String(v))} />
                                         <span className="text-xs">أيام</span>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeReminderDay(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addReminderDay}><PlusCircle className="me-2 h-4 w-4"/>إضافة يوم تذكير</Button>
                            </div>
                        </div>
                         <Separator />
                         <div className="space-y-2">
                             <Label className="font-semibold flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4"/>إشعارات التأخير</Label>
                             <div className="flex items-center gap-2">
                                 <span className="text-xs">إرسال إشعار تأخير بعد</span>
                                 <NumericInput className="w-20 h-8" value={subSettings.reminders?.notifyAfterOverdueDays} onValueChange={v => handleChange('reminders', {...subSettings.reminders, notifyAfterOverdueDays: v || 1})} />
                                 <span className="text-xs">أيام من الاستحقاق</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Banknote className="h-5 w-5"/>الإعدادات المحاسبية</CardTitle>
                    <CardDescription>تحديد حسابات الربط مع شجرة الحسابات.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label className="font-bold">حساب إيراد الاشتراكات</Label>
                             <Autocomplete 
                                searchAction="all"
                                value={subSettings.revenueAccountId || ''}
                                onValueChange={(value) => handleChange('revenueAccountId', value)}
                                placeholder="اختر حساب الإيراد..."
                            />
                        </div>
                         <div className="space-y-1.5">
                            <Label className="font-bold">حساب تكلفة الاشتراكات</Label>
                             <Autocomplete 
                                searchAction="all"
                                value={subSettings.costAccountId || ''}
                                onValueChange={(value) => handleChange('costAccountId', value)}
                                placeholder="اختر حساب التكلفة..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

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
