
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, PlusCircle, Trash2, CheckCircle, Edit, Banknote, Coins, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSettings } from '@/app/settings/actions';
import type { AppSettings, CurrencySettings, CurrencySetting } from '@/lib/types';
import { produce } from 'immer';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Skeleton } from '../ui/skeleton';

const currencyFormSchema = z.object({
  code: z.string().min(3, "الرمز يجب أن يكون 3 أحرف.").max(3, "الرمز يجب أن يكون 3 أحرف.").toUpperCase(),
  name: z.string().min(1, "الاسم مطلوب."),
  symbol: z.string().min(1, "الرمز الخاص مطلوب."),
});
type CurrencyFormValues = z.infer<typeof currencyFormSchema>;

const SectionCard = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
            {children}
        </CardContent>
    </Card>
);

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

export default function CurrencySettings({ settings: initialSettings, onSettingsChanged }: CurrencySettingsProps) {
    const [currencySettings, setCurrencySettings] = useState<CurrencySettings | null>(initialSettings?.currencySettings || null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '' });

    useEffect(() => {
        if(initialSettings?.currencySettings) {
            setCurrencySettings(initialSettings.currencySettings);
        }
    }, [initialSettings]);
    
    const handleSave = useCallback(async () => {
        if (!currencySettings) return;
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
            if (draft) {
                 if (!draft.exchangeRates) draft.exchangeRates = {};
                 draft.exchangeRates[key] = numericValue;
            }
        }));
    };
    
    const handleDefaultCurrencyChange = (value: string) => {
        setCurrencySettings(produce(draft => {
            if (draft) {
                draft.defaultCurrency = value;
            }
        }));
    };
    
    const handleAddNewCurrency = () => {
        if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
            toast({ title: 'خطأ', description: 'الرجاء ملء جميع حقول العملة الجديدة.', variant: 'destructive' });
            return;
        }
        setCurrencySettings(produce(draft => {
            if (draft) {
                if (!draft.currencies) draft.currencies = [];
                if (!draft.currencies.some(c => c.code.toUpperCase() === newCurrency.code.toUpperCase())) {
                    draft.currencies.push({ ...newCurrency, code: newCurrency.code.toUpperCase() });
                    toast({ title: "تمت إضافة العملة", description: "لا تنس حفظ التغييرات."});
                    setNewCurrency({ code: '', name: '', symbol: '' });
                } else {
                     toast({ title: "العملة موجودة بالفعل", variant: 'destructive'});
                }
            }
        }));
    };

    const handleUpdateCurrency = (updatedCurrency: CurrencySetting) => {
        setCurrencySettings(produce(draft => {
            if (draft) {
                const index = (draft.currencies || []).findIndex(c => c.code === updatedCurrency.code);
                if (index !== -1) {
                    draft.currencies![index] = updatedCurrency;
                }
            }
        }));
         toast({ title: "تم تحديث العملة", description: "لا تنس حفظ التغييرات."});
    };
    
    const handleRemoveCurrency = (codeToRemove: string) => {
        if (currencySettings?.defaultCurrency === codeToRemove) {
            toast({ title: "لا يمكن الحذف", description: "لا يمكنك حذف العملة الافتراضية.", variant: 'destructive' });
            return;
        }
        setCurrencySettings(produce(draft => {
            if (draft?.currencies) {
                draft.currencies = draft.currencies.filter(c => c.code !== codeToRemove);
            }
        }));
    };
    
    const exchangeRatePairs = useMemo(() => {
        if (!currencySettings?.currencies || currencySettings.currencies.length < 2) return [];
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
    }, [currencySettings?.currencies]);
    
    if (!currencySettings) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
        );
    }


    return (
        <div className="space-y-6">
            <SectionCard title="إدارة العملات" icon={Coins}>
                <div className="space-y-2">
                    <Label className="font-semibold">العملات المعتمدة (انقر على بطاقة لجعلها الافتراضية)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                         {(currencySettings.currencies || []).map((currency) => (
                           <Card
                              key={currency.code}
                              onClick={() => handleDefaultCurrencyChange(currency.code)}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 relative",
                                currencySettings.defaultCurrency === currency.code && "ring-2 ring-primary border-primary bg-primary/10"
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
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>هل تريد حذف عملة {currency.name}؟ لا يمكنك حذف العملة الافتراضية.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveCurrency(currency.code)} disabled={currency.code === currencySettings.defaultCurrency} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، حذف</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                           </Card>
                        ))}
                    </div>
                </div>
                 <div className="space-y-4 p-4 border rounded-lg mt-4">
                    <h4 className="font-semibold">إضافة عملة جديدة</h4>
                     <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
                        <Input value={newCurrency.code} onChange={(e) => setNewCurrency(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="الرمز (EUR)" />
                        <Input value={newCurrency.name} onChange={(e) => setNewCurrency(p => ({ ...p, name: e.target.value }))} placeholder="الاسم (يورو)" />
                        <Input value={newCurrency.symbol} onChange={(e) => setNewCurrency(p => ({ ...p, symbol: e.target.value }))} placeholder="الرمز (€)" />
                        <Button variant="outline" size="sm" onClick={handleAddNewCurrency}><PlusCircle className="me-2 h-4 w-4" />إضافة</Button>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="إدارة أسعار الصرف" icon={ArrowRightLeft}>
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
            </SectionCard>

            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل إعدادات العملات
                </Button>
            </div>
        </div>
    );
}
