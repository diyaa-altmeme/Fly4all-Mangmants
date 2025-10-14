
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Save,
  PlusCircle,
  Trash2,
  BellRing,
  Settings,
  Banknote,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateSettings } from '@/app/settings/actions';
import { useVoucherNav } from "@/context/voucher-nav-context";
import type { AppSettings, SubscriptionSettings } from "@/lib/types";
import { Autocomplete } from "@/components/ui/autocomplete";
import { NumericInput } from "@/components/ui/numeric-input";
import { produce } from "immer";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const SectionCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 flex-grow">{children}</CardContent>
  </Card>
);

interface SubscriptionsSettingsProps {
  settings: AppSettings;
  onSettingsChanged: () => void;
}

export default function SubscriptionsSettings({
  settings: initialSettings,
  onSettingsChanged,
}: SubscriptionsSettingsProps) {
  const [subSettings, setSubSettings] = useState<Partial<SubscriptionSettings>>(
    initialSettings?.subscriptionSettings || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();

  useEffect(() => setSubSettings(initialSettings?.subscriptionSettings || {}), [
    initialSettings,
  ]);
  
  const supplierOptions = useMemo(
    () => (navData?.suppliers || []).map((s: any) => ({ value: s.id, label: s.name })),
    [navData?.suppliers]
  );

  const handleChange = (key: keyof SubscriptionSettings, value: any) => {
    setSubSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  const handleSave = useCallback(async () => {
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
      toast({ title: "خطأ غير متوقع", description: e.message || "حصل خطأ.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [subSettings, toast, onSettingsChanged]);

  const ensureReminders = (draft: Partial<SubscriptionSettings>) => {
    if (!draft.reminders) draft.reminders = { enabled: true, daysBeforeDue: [], sendTime: "09:00" } as any;
    if (!Array.isArray(draft.reminders.daysBeforeDue)) draft.reminders.daysBeforeDue = [];
    return draft;
  };

  const handleReminderChange = (index: number, value: number) => {
    if (isNaN(value) || value < 0) return;
    setSubSettings(
      produce((draft: Partial<SubscriptionSettings>) => {
        ensureReminders(draft);
        draft.reminders!.daysBeforeDue[index] = Math.round(value);
      })
    );
  };

  const addReminderDay = () => {
    setSubSettings(
      produce((draft: Partial<SubscriptionSettings>) => {
        ensureReminders(draft);
        draft.reminders!.daysBeforeDue.push(1);
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-right">
              <h2 className="text-2xl font-bold">إعدادات الاشتراكات</h2>
              <p className="text-sm text-muted-foreground">تخصيص الإعدادات الافتراضية، التذكيرات، والربط المحاسبي للاشتراكات.</p>
          </div>
          <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                  {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <Save className="me-2 h-4 w-4" /> حفظ كل التغييرات
              </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="الإعدادات الافتراضية" icon={Settings}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>المورد الافتراضي</Label>
              <Autocomplete
                options={supplierOptions}
                value={subSettings.defaultSupplier || ""}
                onValueChange={(v) => handleChange("defaultSupplier", v)}
                placeholder="اختر المورّد"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>الكمية الافتراضية</Label>
                  <NumericInput
                    value={subSettings.defaultQuantity}
                    onValueChange={(v) => handleChange("defaultQuantity", v)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>عدد الأقساط</Label>
                  <NumericInput
                    value={subSettings.defaultInstallments}
                    onValueChange={(v) => handleChange("defaultInstallments", v)}
                  />
                </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="إشعارات وتذكيرات الأقساط" icon={BellRing}>
            <div className="flex justify-between items-center mb-4">
                <Label>تفعيل الإشعارات التلقائية</Label>
                <Switch
                  checked={subSettings.reminders?.enabled}
                  onCheckedChange={(c) =>
                    handleChange("reminders", { ...subSettings.reminders, enabled: c })
                  }
                />
            </div>

            <Separator />
            
            <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2">
                    <Label className="text-sm shrink-0">وقت الإرسال:</Label>
                    <Input type="time" value={(subSettings.reminders as any)?.sendTime || '09:00'} onChange={e => handleChange('reminders', {...subSettings.reminders, sendTime: e.target.value})} className="h-9"/>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">أيام التذكير (قبل الاستحقاق)</Label>
                  {(subSettings.reminders?.daysBeforeDue || []).map((day: number, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs">تذكير قبل</span>
                      <NumericInput
                        className="w-20 h-8"
                        value={day}
                        onValueChange={(v) => handleReminderChange(idx, Number(v || 0))}
                      />
                      <span className="text-xs">أيام</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeReminderDay(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addReminderDay}><PlusCircle className="h-4 w-4 me-2"/> إضافة</Button>
                </div>
            </div>
        </SectionCard>
      </div>

       <SectionCard title="الإعدادات المحاسبية" icon={Banknote}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>حساب إيراد الاشتراكات</Label>
            <Autocomplete
              value={subSettings.revenueAccountId || ""}
              onValueChange={(v) => handleChange("revenueAccountId", v)}
              placeholder="اختر حساب الإيراد..."
            />
          </div>
          <div className="space-y-1">
            <Label>حساب تكلفة الاشتراكات</Label>
            <Autocomplete
              value={subSettings.costAccountId || ""}
              onValueChange={(v) => handleChange("costAccountId", v)}
              placeholder="اختر حساب التكلفة..."
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

