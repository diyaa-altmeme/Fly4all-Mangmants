
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, DollarSign, PlusCircle, Trash2, CheckCircle, Edit, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, CurrencySettings, CurrencySetting } from '@/lib/types';
import { produce } from 'immer';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Skeleton } from '../ui/skeleton';

const currencyFormSchema = z.object({
  code: z.string().min(3, "الرمز يجب أن يكون 3 أحرف.").max(3, "الرمز يجب أن يكون 3 أحرف."),
  name: z.string().min(1, "الاسم مطلوب."),
  symbol: z.string().min(1, "الرمز الخاص مطلوب."),
});
type CurrencyFormValues = z.infer<typeof currencyFormSchema>;

const EditCurrencyDialog = ({ currency, onSave, children }: { currency: CurrencySetting, onSave: (data: CurrencySetting) => void, children: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<CurrencyFormValues>({
        resolver: zodResolver(currencyFormSchema),
        defaultValues: currency
    });
    
    useEffect(() => {
        if(open) form.reset(currency);
    }, [open, currency, form]);

    const handleSubmit = (data: CurrencyFormValues) => {
        onSave({ ...currency, ...data });
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تعديل العملة: {currency.name}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({field}) => (<FormItem><Label>اسم العملة</Label><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        <FormField control={form.control} name="symbol" render={({field}) => (<FormItem><Label>الرمز الخاص (Symbol)</Label><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        <FormField control={form.control} name="code" render={({field}) => (<FormItem><Label>الرمز (Code)</Label><FormControl><Input {...field} disabled /></FormControl><FormMessage/></FormItem>)}/>
                         <DialogFooter>
                            <Button type="submit">حفظ التغييرات</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

interface CurrencySettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

const defaultCurrencySettings: CurrencySettings = {
    defaultCurrency: 'USD',
    exchangeRates: { 'USD_IQD': 1480 },
    currencies: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
        { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },
    ],
};

export default function CurrencySettings({ settings: initialSettings, onSettingsChanged }: CurrencySettingsProps) {
    
    if (!initialSettings) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
        )
    }

    const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(initialSettings.currencySettings || defaultCurrencySettings);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });

    useEffect(() => {
        if(initialSettings?.currencySettings) {
            setCurrencySettings(initialSettings.currencySettings);
        }
    }, [initialSettings]);
    
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const result = await updateSettings({ currencySettings: currencySettings });
            if (result.success) {
                toast({ title: 'تم حفظ إعدادات العملات بنجاح' });
                onSettingsChanged();
            } else {
                toast({ title: 'خطأ', description: result.error || 'لم يتم حفظ الإعدادات.', variant: 'destructive' });
            }
        } catch(e:any) {
            toast({ title: "خطأ غير متوقع", description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [currencySettings, onSettingsChanged, toast]);

    const handleExchangeRateChange = (key: string, value: string) => {
        const numericValue = parseFloat(value) || 0;
        setCurrencySettings(produce(draft => {
            if (!draft.exchangeRates) draft.exchangeRates = {};
            draft.exchangeRates[key] = numericValue;
        }));
    };
    
    const handleDefaultCurrencyChange = (value: string) => {
        setCurrencySettings(produce(draft => {
            draft.defaultCurrency = value;
        }));
    };
    
    const handleAddNewCurrency = () => {
        if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
            toast({ title: 'خطأ', description: 'الرجاء ملء جميع حقول العملة الجديدة.', variant: 'destructive' });
            return;
        }
        setCurrencySettings(produce(draft => {
            if (!draft.currencies) draft.currencies = [];
            if (!draft.currencies.some(c => c.code.toUpperCase() === newCurrency.code.toUpperCase())) {
                draft.currencies.push({ ...newCurrency, code: newCurrency.code.toUpperCase() });
                toast({ title: "تمت إضافة العملة", description: "لا تنس حفظ التغييرات."});
                setNewCurrency({ code: '', name: '', symbol: '' });
            } else {
                 toast({ title: "العملة موجودة بالفعل", variant: 'destructive'});
            }
        }));
    };

    const handleUpdateCurrency = (updatedCurrency: CurrencySetting) => {
        setCurrencySettings(produce(draft => {
            const index = (draft.currencies || []).findIndex(c => c.code === updatedCurrency.code);
            if (index !== -1) {
                draft.currencies![index] = updatedCurrency;
            }
        }));
         toast({ title: "تم تحديث العملة", description: "لا تنس حفظ التغييرات."});
    };
    
    const handleRemoveCurrency = (codeToRemove: string) => {
        if (currencySettings.defaultCurrency === codeToRemove) {
            toast({ title: "لا يمكن الحذف", description: "لا يمكنك حذف العملة الافتراضية.", variant: 'destructive' });
            return;
        }
        setCurrencySettings(produce(draft => {
            if (draft.currencies) {
                draft.currencies = draft.currencies.filter(c => c.code !== codeToRemove);
            }
        }));
    };
    
    // Generate all possible exchange rate pairs
    const exchangeRatePairs = useMemo(() => {
        if (!currencySettings.currencies || currencySettings.currencies.length < 2) return [];
        const pairs: {key: string, from: string, to: string}[] = [];
        for (let i = 0; i < currencySettings.currencies.length; i++) {
            for (let j = 0; j < currencySettings.currencies.length; j++) {
                if (i !== j) {
                    pairs.push({
                        key: `${currencySettings.currencies[i].code}_${currencySettings.currencies[j].code}`,
                        from: currencySettings.currencies[i].code,
                        to: currencySettings.currencies[j].code
                    });
                }
            }
        }
        return pairs;
    }, [currencySettings.currencies]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات العملات وأسعار الصرف</CardTitle>
                <CardDescription>إدارة العملات المعتمدة في النظام وتحديد أسعار الصرف بينها.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label className="font-semibold">العملات المعتمدة (انقر على بطاقة لجعلها الافتراضية)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                         {(currencySettings.currencies || []).map((currency) => (
                           <Card
                              key={currency.code}
                              onClick={() => handleDefaultCurrencyChange(currency.code)}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 relative",
                                currencySettings.defaultCurrency === currency.code && "ring-2 ring-primary border-primary"
                              )}
                            >
                                <CardContent className="p-3 relative">
                                {currencySettings.defaultCurrency === currency.code && (
                                    <CheckCircle className="h-5 w-5 text-primary absolute top-2 right-2"/>
                                )}
                                <div className="text-center space-y-1">
                                    <p className="text-2xl font-bold">{currency.symbol}</p>
                                    <p className="font-semibold">{currency.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{currency.code}</p>
                                </div>
                              </CardContent>
                               <CardFooter className="p-1 flex justify-end">
                                    <EditCurrencyDialog currency={currency} onSave={handleUpdateCurrency}>
                                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Edit className="h-4 w-4"/></Button>
                                    </EditCurrencyDialog>
                                </CardFooter>
                           </Card>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-semibold">إضافة عملة جديدة</h4>
                     <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
                        <Input value={newCurrency.code} onChange={(e) => setNewCurrency(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="الرمز (EUR)" />
                        <Input value={newCurrency.name} onChange={(e) => setNewCurrency(p => ({ ...p, name: e.target.value }))} placeholder="الاسم (يورو)" />
                        <Input value={newCurrency.symbol} onChange={(e) => setNewCurrency(p => ({ ...p, symbol: e.target.value }))} placeholder="الرمز (€)" />
                        <Button variant="outline" size="sm" onClick={handleAddNewCurrency}><PlusCircle className="me-2 h-4 w-4" />إضافة</Button>
                    </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <Label className="font-semibold">أسعار الصرف</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exchangeRatePairs.map(pair => (
                            <div key={pair.key} className="space-y-1.5">
                                <Label htmlFor={`rate-${pair.key}`}>سعر صرف {pair.from} مقابل {pair.to}</Label>
                                <div className="relative">
                                    <Input
                                        id={`rate-${pair.key}`}
                                        type="number"
                                        step="any"
                                        value={currencySettings.exchangeRates?.[pair.key] || ''}
                                        onChange={(e) => handleExchangeRateChange(pair.key, e.target.value)}
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
                    حفظ كل إعدادات العملات
                </Button>
            </CardFooter>
        </Card>
    );
}
