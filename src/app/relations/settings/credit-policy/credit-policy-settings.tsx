
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { getSettings, updateSettings } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, CreditPolicySettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditPolicySettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}


export default function CreditPolicySettings({ settings: initialSettings, onSettingsChanged }: CreditPolicySettingsProps) {
  const [settings, setSettings] = useState<CreditPolicySettings | null>(initialSettings.creditPolicySettings || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSettings(initialSettings.creditPolicySettings || { defaultCreditLimit: 10000, defaultGracePeriodDays: 30 });
  }, [initialSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const result = await updateSettings({ creditPolicySettings: settings });
    if (result.success) {
      toast({ title: 'تم حفظ السياسات بنجاح' });
      onSettingsChanged();
    } else {
      toast({ title: 'خطأ', description: 'لم يتم حفظ السياسات', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  if (isLoading || !settings) {
    return (
        <div className="space-y-4">
             <div>
                <h2 className="text-xl font-bold">سياسات الدفع الآجل</h2>
                <p className="text-sm text-muted-foreground">
                    تحديد الشروط الافتراضية للعملاء الذين يتعاملون بالآجل.
                </p>
            </div>
             <div className="p-4 border rounded-lg space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-full" />
             </div>
             <div className="flex justify-end">
                <Skeleton className="h-10 w-28" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-4">
        <div>
            <h2 className="text-xl font-bold">سياسات الدفع الآجل</h2>
            <p className="text-sm text-muted-foreground">
                تحديد الشروط الافتراضية للعملاء الذين يتعاملون بالآجل.
            </p>
        </div>
        <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-1">
                <Label htmlFor="creditLimit">حد الائتمان الافتراضي (USD)</Label>
                <Input
                    id="creditLimit"
                    type="number"
                    value={settings.defaultCreditLimit}
                    onChange={(e) => setSettings(s => s ? { ...s, defaultCreditLimit: Number(e.target.value) } : null)}
                />
                 <p className="text-xs text-muted-foreground">
                    أقصى مبلغ يمكن أن يصل إليه دين العميل قبل إيقاف التعامل معه.
                </p>
            </div>
            <div className="space-y-1">
                <Label htmlFor="gracePeriod">فترة السماح (أيام)</Label>
                <Input
                    id="gracePeriod"
                    type="number"
                    value={settings.defaultGracePeriodDays}
                    onChange={(e) => setSettings(s => s ? { ...s, defaultGracePeriodDays: Number(e.target.value) } : null)}
                />
                 <p className="text-xs text-muted-foreground">
                    عدد الأيام المسموح بها قبل أن يعتبر الدين متأخرًا.
                </p>
            </div>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Save className="me-2 h-4 w-4" />
                حفظ السياسات
            </Button>
        </div>
    </div>
  );
}
