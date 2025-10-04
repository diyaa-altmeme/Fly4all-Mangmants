
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Settings, SlidersHorizontal, BellRing, GitBranch, Banknote, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Autocomplete } from '../ui/autocomplete';
import type { AppSettings, SubscriptionSettings } from '@/lib/types';
import { updateSettings } from '@/app/settings/actions';
import { produce } from 'immer';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { NumericInput } from '../ui/numeric-input';

const SectionCard = ({ icon: Icon, title, description, children }: { icon: React.ElementType, title: string, description: string, children: React.ReactNode }) => (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start gap-4">
            <Icon className="h-8 w-8 text-primary mt-1" />
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

interface SubscriptionsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function SubscriptionsSettings({ settings: initialSettings, onSettingsChanged }: SubscriptionsSettingsProps) {
    const { data: navData, loaded } = useVoucherNav();
    const [settings, setSettings] = useState<SubscriptionSettings>(initialSettings?.subscriptionSettings || {});
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setSettings(initialSettings?.subscriptionSettings || {});
    }, [initialSettings]);

    const accountOptions = React.useMemo(() => {
      if(!loaded || !navData) return [];
      return [
        ...(navData.clients || []).map(c => ({ value: c.id, label: `عميل: ${c.name}` })),
        ...(navData.suppliers || []).map(s => ({ value: s.id, label: `مورد: ${s.name}` })),
        ...(navData.boxes || []).map(b => ({ value: b.id, label: `صندوق: ${b.name}` }))
      ];
    }, [loaded, navData]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ subscriptionSettings: settings });
        if (result.success) {
            toast({ title: "تم حفظ الإعدادات بنجاح" });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: "لم يتم حفظ الإعدادات.", variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleChange = (key: keyof typeof settings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6">
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <SectionCard
                        icon={SlidersHorizontal}
                        title="الإعدادات الافتراضية"
                        description="تحديد القيم الأولية عند إضافة اشتراك جديد لتسريع الإدخال."
                    >
                        <div className="space-y-2">
                            <Label>المورد الافتراضي</Label>
                            <Autocomplete 
                                searchAction="suppliers" 
                                value={settings.defaultSupplier || ''}
                                onValueChange={(v) => handleChange('defaultSupplier', v)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>عدد الدفعات الافتراضي</Label>
                            <NumericInput type="text" inputMode="numeric" value={settings.defaultInstallments || 12} onValueChange={(v) => handleChange('defaultInstallments', v || 0)} />
                        </div>
                         <div className="space-y-2">
                            <Label>هامش الربح الافتراضي (%)</Label>
                             <NumericInput type="text" inputMode="numeric" value={settings.defaultProfitMargin || 20} onValueChange={(v) => handleChange('defaultProfitMargin', v || 0)} />
                        </div>
                         <div className="space-y-2">
                            <Label>فترة السماح قبل أول دفعة (أيام)</Label>
                            <NumericInput type="text" inputMode="numeric" value={settings.firstInstallmentAfterDays || 30} onValueChange={(v) => handleChange('firstInstallmentAfterDays', v || 0)} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label>تفعيل الاشتراك تلقائيًا عند الإضافة؟</Label>
                            <Switch checked={settings.autoActivate} onCheckedChange={(c) => handleChange('autoActivate', c)} />
                        </div>
                    </SectionCard>
                    <SectionCard
                        icon={GitBranch}
                        title="إعدادات التقسيط"
                        description="التحكم في سياسات وشروط تقسيم الدفعات للعملاء."
                    >
                        <div className="space-y-2">
                             <Label>نوع التقسيط</Label>
                            <Select value={settings.installmentMethod} onValueChange={(v) => handleChange('installmentMethod', v)}>
                                <SelectTrigger><SelectValue placeholder="اختر نوع التقسيط..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="automatic">تلقائي</SelectItem>
                                    <SelectItem value="manual" disabled>يدوي (قريبًا)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>الحد الأقصى لعدد الدفعات</Label>
                            <NumericInput type="text" inputMode="numeric" value={settings.maxInstallments || 24} onValueChange={(v) => handleChange('maxInstallments', v || 0)} />
                        </div>
                         <div className="space-y-2">
                            <Label>أقل مبلغ ممكن للدفعة الواحدة (بالعملة الافتراضية)</Label>
                            <NumericInput type="text" inputMode="numeric" value={settings.minInstallmentAmount || 50} onValueChange={(v) => handleChange('minInstallmentAmount', v || 0)} />
                        </div>
                    </SectionCard>

                     <SectionCard
                        icon={BellRing}
                        title="التنبيهات والإشعارات"
                        description="تخصيص كامل للتنبيهات المرسلة للمستخدمين والعملاء."
                    >
                        <div className="space-y-2">
                             <Label>تنبيه قبل موعد الدفعة بـ (أيام)</Label>
                             <NumericInput type="text" inputMode="numeric" value={settings.reminderDaysBefore || 3} onValueChange={(v) => handleChange('reminderDaysBefore', v || 0)} />
                        </div>
                        <div className="space-y-2">
                            <Label>تكرار التنبيه</Label>
                             <Select value={settings.reminderFrequency} onValueChange={(v) => handleChange('reminderFrequency', v)}>
                                <SelectTrigger><SelectValue placeholder="اختر التكرار..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">يومي</SelectItem>
                                    <SelectItem value="weekly">أسبوعي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                             <Label>تنبيه للمسؤول إذا تأخر العميل أكثر من (أيام)</Label>
                             <NumericInput type="text" inputMode="numeric" value={settings.alertAdminOnDelay || 5} onValueChange={(v) => handleChange('alertAdminOnDelay', v || 0)} />
                        </div>
                    </SectionCard>
                     <SectionCard
                        icon={Banknote}
                        title="الربط المحاسبي"
                        description="تحديد حسابات الإيرادات والتكاليف لتسجيل قيود محاسبية تلقائية."
                    >
                         <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label>إنشاء قيد محاسبي تلقائيًا؟</Label>
                            <Switch checked={settings.autoCreateJournalEntry} onCheckedChange={(c) => handleChange('autoCreateJournalEntry', c)} />
                        </div>
                         <div className="space-y-2">
                            <Label>حساب الإيرادات</Label>
                             <Autocomplete 
                                searchAction='all'
                                options={accountOptions} 
                                value={settings.revenueAccountId || ''}
                                onValueChange={(v) => handleChange('revenueAccountId', v)}
                                placeholder="اختر حساب الإيرادات..."
                            />
                        </div>
                          <div className="space-y-2">
                            <Label>حساب التكاليف</Label>
                             <Autocomplete 
                                searchAction='all'
                                options={accountOptions}
                                value={settings.costAccountId || ''}
                                onValueChange={(v) => handleChange('costAccountId', v)}
                                 placeholder="اختر حساب التكاليف..."
                            />
                        </div>
                    </SectionCard>
                </div>
            </div>
             <div className="flex justify-end mt-6 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 -mb-6 -mx-6 px-6">
                <Button size="lg" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ الإعدادات
                </Button>
            </div>
        </div>
    );
}
