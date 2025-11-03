
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, CurrencySettings } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CurrencySettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function CurrencySettings({ settings: initialSettings, onSettingsChanged }: CurrencySettingsProps) {
    const [currencySettings, setCurrencySettings] = useState<CurrencySettings | undefined>(initialSettings?.currencySettings);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setCurrencySettings(initialSettings?.currencySettings || { defaultCurrency: 'USD', exchangeRates: {}, currencies: [] });
    }, [initialSettings]);

    const handleExchangeRateChange = (key: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        setCurrencySettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                exchangeRates: {
                    ...prev.exchangeRates,
                    [key]: numericValue
                }
            };
        });
    };
    
    const handleDefaultCurrencyChange = (value: string) => {
        setCurrencySettings(prev => prev ? ({ ...prev, defaultCurrency: value }) : prev);
    };

    const handleSave = async () => {
        if (!currencySettings) return;
        setIsSaving(true);
        const result = await updateSettings({ currencySettings: currencySettings });
        if (result.success) {
            toast({ title: 'تم حفظ إعدادات العملات بنجاح' });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات.', variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (!currencySettings) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات العملات وأسعار الصرف</CardTitle>
                <CardDescription>
                    تحديد العملة الافتراضية للنظام وإدارة أسعار الصرف بين العملات المختلفة.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-1.5 max-w-sm">
                    <Label>العملة الافتراضية للنظام</Label>
                    <Select value={currencySettings.defaultCurrency} onValueChange={handleDefaultCurrencyChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {currencySettings.currencies.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.name} ({c.symbol})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 pt-4 border-t">
                    <Label className="font-semibold">أسعار الصرف</Label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(currencySettings.exchangeRates).map(([key, value]) => (
                            <div key={key} className="space-y-1.5">
                                <Label htmlFor={`rate-${key}`}>سعر صرف {key.replace('_', ' إلى ')}</Label>
                                 <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id={`rate-${key}`}
                                        type="number"
                                        step="any"
                                        value={value}
                                        onChange={(e) => handleExchangeRateChange(key, e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        ))}
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
