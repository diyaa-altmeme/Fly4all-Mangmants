"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, PlusCircle, Trash2, BellRing, Clock, AlertTriangle, Settings, UserCheck, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateSettings } from '@/app/settings/actions';
import { useVoucherNav } from "@/context/voucher-nav-context";
import type { AppSettings, SubscriptionSettings } from "@/lib/types";
import { Autocomplete } from "@/components/ui/autocomplete";
import { NumericInput } from "@/components/ui/numeric-input";
import { produce } from "immer";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface SubscriptionsSettingsProps {
  settings: AppSettings;
  onSettingsChanged: () => void;
}

export default function SubscriptionsSettings({ settings: initialSettings, onSettingsChanged }: SubscriptionsSettingsProps) {
  const [subSettings, setSubSettings] = useState<Partial<SubscriptionSettings>>(initialSettings?.subscriptionSettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();

  useEffect(() => setSubSettings(initialSettings?.subscriptionSettings || {}), [initialSettings]);

  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map((s: any) => ({ value: s.id, label: s.name })), [navData?.suppliers]);

  const validate = (draftSettings: Partial<SubscriptionSettings>) => {
    const errs: Record<string, string> = {};
    if (draftSettings.defaultQuantity != null && draftSettings.defaultQuantity <= 0) errs.defaultQuantity = "الكمية يجب أن تكون أكبر من صفر";
    if (draftSettings.defaultInstallments != null && draftSettings.defaultInstallments <= 0) errs.defaultInstallments = "عدد الأقساط يجب أن يكون أكبر من صفر";
    const days = draftSettings.reminders?.daysBeforeDue || [];
    const dup = days.some((d: number, i: number) => days.indexOf(d) !== i);
    if (dup) errs.reminders = "أيام التذكير يجب أن تكون مختلفة";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate(subSettings)) {
      toast({ title: "خطأ في المدخلات", description: "تأكد من صحة الحقول قبل الحفظ.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateSettings({ subscriptionSettings: subSettings });
      if (result.success) {
        toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الاشتراكات بنجاح." });
        onSettingsChanged();
      } else {
        toast({ title: "خطأ", description: "تعذر حفظ الإعدادات.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "خطأ غير متوقع", description: e.message || "حصل خطأ عند الحفظ.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof SubscriptionSettings, value: any) => {
    setSubSettings((prev) => ({ ...prev, [key]: value }));
  };

  const ensureReminders = (draft: Partial<SubscriptionSettings>) => {
    if (!draft.reminders) draft.reminders = { enabled: true, daysBeforeDue: [], sendTime: "09:00" } as any;
    if (!Array.isArray(draft.reminders.daysBeforeDue)) draft.reminders.daysBeforeDue = [];
  };

  const handleReminderChange = (index: number, value: number) => {
    if (isNaN(value) || value < 0) return;
    setSubSettings(
      produce((draft: Partial<SubscriptionSettings>) => {
        ensureReminders(draft);
        draft.reminders!.daysBeforeDue[index] = Math.round(value);
        draft.reminders!.daysBeforeDue = Array.from(new Set(draft.reminders!.daysBeforeDue)).sort((a: number, b: number) => b - a);
      })
    );
  };

  const addReminderDay = (day = 1) => {
    setSubSettings(
      produce((draft: Partial<SubscriptionSettings>) => {
        ensureReminders(draft);
        draft.reminders!.daysBeforeDue.push(day);
        draft.reminders!.daysBeforeDue = Array.from(new Set(draft.reminders!.daysBeforeDue)).sort((a: number, b: number) => b - a);
      })
    );
  };

  const removeReminderDay = (index: number) => {
    setSubSettings(
      produce((draft: Partial<SubscriptionSettings>) => {
        ensureReminders(draft);
        draft.reminders!.daysBeforeDue.splice(index, 1);
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/>الإعدادات الافتراضية</CardTitle>
                <CardDescription>لتسريع عملية إضافة اشتراك جديد.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-1.5">
                   <Label className="font-semibold">المورد الافتراضي</Label>
                    <Autocomplete 
                       options={supplierOptions} 
                       value={subSettings.defaultSupplier || ''}
                       onValueChange={(value) => handleChange('defaultSupplier', value)}
                       placeholder="اختر موردًا..."
                   />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                     <Label className="font-semibold">الكمية الافتراضية</Label>
                     <NumericInput value={subSettings.defaultQuantity} onValueChange={(v) => handleChange('defaultQuantity', v || 1)} aria-label="Default quantity" />
                     {errors.defaultQuantity && <p className="text-xs text-destructive">{errors.defaultQuantity}</p>}
                 </div>
                  <div className="space-y-1.5">
                     <Label className="font-semibold">عدد الأقساط الافتراضي</Label>
                     <NumericInput value={subSettings.defaultInstallments} onValueChange={(v) => handleChange('defaultInstallments', v || 12)} aria-label="Default installments" />
                     {errors.defaultInstallments && <p className="text-xs text-destructive">{errors.defaultInstallments}</p>}
                 </div>
               </div>
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5"/>إشعارات وتذكيرات الأقساط</CardTitle>
                        <CardDescription>إدارة التذكيرات التلقائية للأقساط.</CardDescription>
                    </div>
                     <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch id="reminders-enabled" checked={subSettings.reminders?.enabled} onCheckedChange={(c) => handleChange('reminders', {...subSettings.reminders, enabled: c})} />
                        <Label htmlFor="reminders-enabled" className="font-semibold text-sm">تفعيل</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-3">
                        <Label className="font-semibold flex items-center gap-2 text-sm"><Clock className="h-4 w-4"/>توقيتات التذكير</Label>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="sendTime" className="text-xs shrink-0">وقت الإرسال:</Label>
                            <Input id="sendTime" type="time" value={subSettings.reminders?.sendTime || "09:00"} onChange={e => handleChange('reminders', {...subSettings.reminders, sendTime: e.target.value})} className="h-8"/>
                        </div>
                    </div>
                    <div className="space-y-3">
                         <Label className="font-semibold flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4"/>إشعارات التأخير</Label>
                         <div className="flex items-center gap-2">
                             <span className="text-xs">إرسال إشعار تأخير بعد</span>
                             <NumericInput className="w-20 h-8" value={subSettings.reminders?.notifyAfterOverdueDays} onValueChange={v => handleChange('reminders', {...subSettings.reminders, notifyAfterOverdueDays: v || 1})} />
                             <span className="text-xs">أيام من الاستحقاق</span>
                        </div>
                    </div>
                </div>
                 <div className="space-y-2 pt-4 border-t">
                    <Label className="font-semibold">أيام التذكير (قبل الاستحقاق)</Label>
                    {(subSettings.reminders?.daysBeforeDue || []).map((day, index) => (
                        <div key={index} className="flex items-center gap-2">
                             <span className="text-xs">تذكير قبل</span>
                             <NumericInput className="w-20 h-8" value={day} onValueChange={(v) => handleReminderChange(index, Number(v || 0))} aria-label={`reminder-${index}`} />
                             <span className="text-xs">أيام</span>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeReminderDay(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addReminderDay(1)}><PlusCircle className="me-2 h-4 w-4"/>إضافة يوم تذكير</Button>
                    {errors.reminders && <p className="text-xs text-destructive">{errors.reminders}</p>}
                </div>
            </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5"/>الإعدادات المحاسبية</CardTitle>
                <CardDescription>تحديد حسابات الربط مع شجرة الحسابات.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="font-semibold">حساب إيراد الاشتراكات</Label>
                         <Autocomplete 
                            searchAction="all"
                            value={subSettings.revenueAccountId || ''}
                            onValueChange={(value) => handleChange('revenueAccountId', value)}
                            placeholder="اختر حساب الإيراد..."
                        />
                    </div>
                     <div className="space-y-1.5">
                        <Label className="font-semibold">حساب تكلفة الاشتراكات</Label>
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
        <Button onClick={() => handleSave()} disabled={isSaving} size="lg">
          {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          <Save className="me-2 h-4 w-4" /> حفظ كل التغييرات
        </Button>
      </div>
    </div>
  );
}
