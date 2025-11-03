
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, CurrencySettings, CurrencySetting } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { produce } from 'immer';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';


interface CurrencySettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function CurrencySettings({ settings: initialSettings, onSettingsChanged }: CurrencySettingsProps) {
    const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(initialSettings?.currencySettings || { defaultCurrency: 'USD', exchangeRates: {}, currencies: [] });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });


    useEffect(() => {
        setCurrencySettings(initialSettings?.currencySettings || { defaultCurrency: 'USD', exchangeRates: {}, currencies: [] });
    }, [initialSettings]);

    const handleExchangeRateChange = (key: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        setCurrencySettings(produce(draft => {
            draft.exchangeRates[key] = numericValue;
        }));
    };
    
    const handleDefaultCurrencyChange = (value: string) => {
        setCurrencySettings(produce(draft => {
            draft.defaultCurrency = value;
        }));
    };
    
    const handleCurrencyFieldChange = (index: number, field: keyof CurrencySetting, value: string) => {
        setCurrencySettings(produce(draft => {
            (draft.currencies[index] as any)[field] = value;
        }));
    };

    const handleAddNewCurrency = () => {
        if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
            toast({ title: 'خطأ', description: 'الرجاء ملء جميع حقول العملة الجديدة.', variant: 'destructive' });
            return;
        }
        setCurrencySettings(produce(draft => {
            draft.currencies.push({ ...newCurrency, code: newCurrency.code.toUpperCase() });
        }));
        setNewCurrency({ code: '', name: '', symbol: '' });
    };
    
    const handleRemoveCurrency = (index: number) => {
        setCurrencySettings(produce(draft => {
            draft.currencies.splice(index, 1);
        }));
    }


    const handleSave = async () => {
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
    
    const exchangeRatePairs = currencySettings.currencies.flatMap((c1) =>
      currencySettings.currencies
        .filter((c2) => c1.code !== c2.code)
        .map((c2) => `${c1.code}_${c2.code}`)
    );


    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات العملات وأسعار الصرف</CardTitle>
                <CardDescription>
                    إدارة العملات المعتمدة في النظام وتحديد أسعار الصرف بينها.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">العملات المعتمدة</h4>
                    <div className="space-y-2">
                        {currencySettings.currencies.map((currency, index) => (
                            <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center">
                                <Input value={currency.code} onChange={(e) => handleCurrencyFieldChange(index, 'code', e.target.value.toUpperCase())} placeholder="الرمز (USD)" />
                                <Input value={currency.name} onChange={(e) => handleCurrencyFieldChange(index, 'name', e.target.value)} placeholder="الاسم (دولار أمريكي)" />
                                <Input value={currency.symbol} onChange={(e) => handleCurrencyFieldChange(index, 'symbol', e.target.value)} placeholder="الرمز ($)" />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                            <AlertDialogDescription>سيتم حذف هذه العملة من القائمة. تأكد من عدم وجود معاملات مرتبطة بها.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveCurrency(index)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end pt-2 border-t">
                        <Input value={newCurrency.code} onChange={(e) => setNewCurrency(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="الرمز (EUR)" />
                        <Input value={newCurrency.name} onChange={(e) => setNewCurrency(p => ({ ...p, name: e.target.value }))} placeholder="الاسم (يورو)" />
                        <Input value={newCurrency.symbol} onChange={(e) => setNewCurrency(p => ({ ...p, symbol: e.target.value }))} placeholder="الرمز (€)" />
                        <Button variant="outline" size="sm" onClick={handleAddNewCurrency}><PlusCircle className="me-2 h-4 w-4" />إضافة</Button>
                    </div>
                </div>

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
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exchangeRatePairs.map(key => (
                            <div key={key} className="space-y-1.5">
                                <Label htmlFor={`rate-${key}`}>سعر صرف {key.replace('_', ' إلى ')}</Label>
                                 <div className="relative">
                                    <Input
                                        id={`rate-${key}`}
                                        type="number"
                                        step="any"
                                        value={currencySettings.exchangeRates[key] || ''}
                                        onChange={(e) => handleExchangeRateChange(key, e.target.value)}
                                        className="pe-8"
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

    