
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, DeveloperSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { produce } from 'immer';

interface DeveloperSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function DeveloperSettings({ settings: initialSettings, onSettingsChanged }: DeveloperSettingsProps) {
    const [devSettings, setDevSettings] = useState<DeveloperSettings>(initialSettings.developerSettings || { devModeEnabled: false });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setDevSettings(initialSettings.developerSettings || { devModeEnabled: false });
    }, [initialSettings]);

    const handleToggleDevMode = async (checked: boolean) => {
        setIsSaving(true);
        const newSettings = produce(devSettings, draft => {
            draft.devModeEnabled = checked;
        });
        
        const result = await updateSettings({ developerSettings: newSettings });

        if (result.success) {
            setDevSettings(newSettings);
            toast({
                title: "تم تحديث وضع المطور",
                description: `تم ${checked ? 'تفعيل' : 'إلغاء تفعيل'} وضع المطور. سيتم تطبيق التغيير بعد إعادة تحميل الصفحة.`,
            });
            onSettingsChanged();
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات المطور</CardTitle>
                <CardDescription>
                    خيارات مخصصة لتسهيل عملية تطوير واختبار النظام.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>تحذير: منطقة خطرة!</AlertTitle>
                    <AlertDescription>
                        تغيير هذه الإعدادات قد يؤثر على أمان النظام بشكل كبير. استخدمها فقط في بيئة التطوير المحلية ولا تقم بتفعيلها في بيئة الإنتاج أبدًا.
                    </AlertDescription>
                </Alert>

                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="dev-mode-switch" className="text-base">
                            وضع المطور
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            عند التفعيل، يتم تجاوز صفحة تسجيل الدخول والدخول تلقائيًا كمدير النظام.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                         {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
                        <Switch
                            id="dev-mode-switch"
                            checked={devSettings.devModeEnabled}
                            onCheckedChange={handleToggleDevMode}
                            disabled={isSaving}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
