

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Trash2, PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, CurrencySetting } from '@/lib/types';
import { produce } from 'immer';
import { NumericInput } from '../ui/numeric-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const SectionCard = ({ title, description, children, footer }: { title: string, description?: string, children: React.ReactNode, footer?: React.ReactNode }) => (
    <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
);

interface CurrencySettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function CurrencySettings({ settings: initialSettings, onSettingsChanged }: CurrencySettingsProps) {
    const [settings, setSettings] = useState(initialSettings.currencySettings);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        setSettings(initialSettings.currencySettings);
    }, [initialSettings]);
    
    if (!settings) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    const handleCurrencyChange = (index: number, key: keyof CurrencySetting, value: string) => {
        setSettings(produce(draft => {
            if (draft?.currencies) {
                (draft.currencies[index] as any)[key] = value;
            }
        }));
    };
    
    const handleAddCurrency = () => {
        setSettings(produce(draft => {
            if (draft) {
                draft.currencies.push({ code: '', name: '', symbol: '' });
            }
        }));
    };
    
    const handleRemoveCurrency = (index: number) => {
        setSettings(produce(draft => {
            if (draft?.currencies) {
                draft.currencies.splice(index, 1);
            }
        }));
    };
    
    const handleExchangeRateChange = (key: string, value?: number) => {
        setSettings(produce(draft => {
            if (draft) {
                draft.exchangeRates[key] = value || 0;
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ currencySettings: settings });
        if(result.success) {
            toast({ title: "تم حفظ الإعدادات بنجاح" });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: "لم يتم حفظ الإعدادات.", variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <SectionCard 
                title="إدارة العملات" 
                description="إضافة وتعديل العملات المعتمدة في النظام وتحديد العملة الافتراضية."
            >
                <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/4">رمز العملة (Code)</TableHead>
                                    <TableHead className="w-1/4">اسم العملة</TableHead>
                                    <TableHead className="w-1/4">الرمز (Symbol)</TableHead>
                                    <TableHead className="text-center w-[50px]">حذف</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settings.currencies.map((currency, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Input value={currency.code} onChange={e => handleCurrencyChange(index, 'code', e.target.value.toUpperCase())} className="font-mono" /></TableCell>
                                        <TableCell><Input value={currency.name} onChange={e => handleCurrencyChange(index, 'name', e.target.value)} /></TableCell>
                                        <TableCell><Input value={currency.symbol} onChange={e => handleCurrencyChange(index, 'symbol', e.target.value)} /></TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveCurrency(index)} disabled={currency.code === 'USD' || currency.code === 'IQD'}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </div>
                     <Button variant="outline" size="sm" onClick={handleAddCurrency}><PlusCircle className="me-2 h-4 w-4"/>إضافة عملة جديدة</Button>
                </div>
            </SectionCard>
            
            <SectionCard 
                title="أسعار الصرف" 
                description="حدد أسعار الصرف بين العملات المختلفة."
            >
                <div className="space-y-4 max-w-md">
                    {settings.currencies.flatMap((c1, i) => 
                        settings.currencies.slice(i + 1).map(c2 => {
                            const key1 = `${c1.code}_${c2.code}`;
                            const key2 = `${c2.code}_${c1.code}`;
                            return (
                                <div key={key1} className="flex items-center gap-2">
                                    <Label className="flex-1 text-left" htmlFor={key1}>1 {c1.name} =</Label>
                                    <NumericInput id={key1} value={settings.exchangeRates[key1]} onValueChange={v => handleExchangeRateChange(key1, v)} />
                                    <span className="font-semibold">{c2.name}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </SectionCard>

            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات
                </Button>
            </div>
        </div>
    );
}
