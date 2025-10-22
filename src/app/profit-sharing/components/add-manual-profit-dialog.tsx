
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type ProfitShare, saveManualProfitDistribution, updateManualProfitDistribution } from "../actions";
import { Loader2, Save, Percent, Edit, PlusCircle, Trash2, CalendarIcon, Wallet, Landmark, Users, ArrowLeft, Hash, User as UserIcon } from "lucide-react";
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Currency, Client, MonthlyProfit } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useAuth } from "@/lib/auth-context";
import { NumericInput } from '@/components/ui/numeric-input';
import { Separator } from "@/components/ui/separator";

const partnerSchema = z.object({
  partnerId: z.string().min(1, "اختر شريكاً."),
  partnerName: z.string(),
  percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا تتجاوز 100."),
  amount: z.coerce.number(), // This field is for calculation display, not direct input
});

const formSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب" }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب" }),
  sourceAccountId: z.string().min(1, { message: "مصدر الأرباح مطلوب."}),
  profit: z.coerce.number().positive("الربح يجب أن يكون أكبر من صفر"),
  currency: z.enum(['USD', 'IQD']),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(50),
  partners: z.array(partnerSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;
export type PartnerShare = z.infer<typeof partnerSchema>;

interface AddManualProfitDialogProps {
  partners: { id: string; name: string; type: string }[];
  onSuccess: () => void;
  isEditing?: boolean;
  period?: MonthlyProfit;
  children: React.ReactNode;
}

const AmountInput = ({ currency, ...props }: { currency: Currency } & React.ComponentProps<typeof Input>) => (
    <div className="relative">
        <Input type="text" inputMode="decimal" className="ps-12 font-mono" placeholder="0.00" {...props} />
        <div className="absolute inset-y-0 left-0 flex items-center">
            <div className="p-2 bg-muted border-e rounded-s-md h-full flex items-center">
                <span className="text-xs font-semibold text-muted-foreground">{currency}</span>
            </div>
        </div>
    </div>
);

const SummaryStat = ({ label, value, currency, className }: { label: string; value: number; currency: Currency; className?: string }) => (
    <div className={cn("p-2 rounded-md text-center", className)}>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-mono font-bold text-lg">{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</p>
    </div>
);


export default function AddManualProfitDialog({ partners: partnersFromProps, onSuccess, isEditing = false, period, children }: AddManualProfitDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: navData } = useVoucherNav();
  
  const [editingPartnerIndex, setEditingPartnerIndex] = useState<number | null>(null);
  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const [currentPercentage, setCurrentPercentage] = useState<number | string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting, errors }, trigger, reset: resetForm, getValues } = form;
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "partners",
  });
  
  const allAccountsOptions = useMemo(() => {
    if (!navData) return [];
    return [
      ...(navData.clients || []).map(c => ({ value: c.id, label: `عميل: ${c.name}` })),
      ...(navData.suppliers || []).map(s => ({ value: s.id, label: `مورد: ${s.name}` }))
    ];
  }, [navData]);

  const watchedPartners = watch('partners');
  const watchedProfit = watch('profit');
  const watchedCurrency = watch('currency');
  const alrawdatainPercentage = watch('alrawdatainSharePercentage');

  useEffect(() => {
    if (open) {
      if (isEditing && period) {
        const alrawdatainData = period.partners?.find(p => p.partnerId === 'alrawdatain_share');
        resetForm({
          fromDate: period.fromDate ? parseISO(period.fromDate) : new Date(),
          toDate: period.toDate ? parseISO(period.toDate) : new Date(),
          profit: period.totalProfit,
          currency: period.currency || 'USD',
          sourceAccountId: period.sourceAccountId || '',
          alrawdatainSharePercentage: alrawdatainData?.percentage || 50,
          partners: (period.partners || []).filter(p => p.partnerId !== 'alrawdatain_share').map(p => ({ partnerId: p.partnerId, partnerName: p.partnerName, percentage: p.percentage, amount: p.amount })),
        });
      } else {
        resetForm({ fromDate: new Date(), toDate: new Date(), profit: 0, currency: 'USD', partners: [], alrawdatainSharePercentage: 50 });
      }
      setCurrentPartnerId('');
      setCurrentPercentage('');
      setEditingPartnerIndex(null);
    }
  }, [open, isEditing, period, resetForm]);
  
   const boxName = useMemo(() => {
    if (!currentUser || !('boxId' in currentUser)) return 'غير محدد';
    return navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد';
  }, [currentUser, navData?.boxes]);


  const { totalPartnerPercentage, amountForPartners, alrawdatainShareAmount, distributedToPartners, remainderForPartners } = useMemo(() => {
    const totalProfit = Number(watchedProfit) || 0;
    const alrawdatainPerc = Number(alrawdatainPercentage) || 0;

    const alrawdatainAmount = (totalProfit * alrawdatainPerc) / 100;
    const availableForPartners = totalProfit - alrawdatainAmount;
    
    const partnerPerc = (watchedPartners || []).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
    const distributedAmount = (watchedPartners || []).reduce((acc, p) => acc + ((availableForPartners * (p.percentage || 0)) / 100), 0);

    return { 
        totalPartnerPercentage: partnerPerc, 
        amountForPartners: availableForPartners, 
        alrawdatainShareAmount: alrawdatainAmount,
        distributedToPartners: distributedAmount,
        remainderForPartners: availableForPartners - distributedAmount,
    };
  }, [watchedProfit, alrawdatainPercentage, watchedPartners]);


  const distribution = useMemo(() => {
    const calculatedPartners: PartnerShare[] = (watchedPartners || []).map(p => {
         return {
            ...p,
            amount: (amountForPartners * (p.percentage || 0)) / 100
         }
    });
    
    calculatedPartners.push({
        partnerId: 'alrawdatain_share',
        partnerName: 'حصة الروضتين',
        percentage: alrawdatainPercentage,
        amount: alrawdatainShareAmount,
    });
    
    return calculatedPartners;
  }, [watchedPartners, amountForPartners, alrawdatainPercentage, alrawdatainShareAmount, partnersFromProps]);
  
  const handleSave = async (data: FormValues) => {
    if (totalPartnerPercentage > 100) {
        toast({ title: "خطأ", description: "مجموع نسب الشركاء الفرعيين يتجاوز 100%", variant: "destructive" });
        return;
    }

    const payload = {
        fromDate: format(data.fromDate, 'yyyy-MM-dd'),
        toDate: format(data.toDate, 'yyyy-MM-dd'),
        sourceAccountId: data.sourceAccountId,
        profit: data.profit,
        currency: data.currency,
        partners: distribution.map(({ partnerId, partnerName, percentage, amount }) => ({ 
            partnerId, 
            partnerName, 
            percentage, 
            amount 
        })),
    };
    
    const result = isEditing && period ? await updateManualProfitDistribution(period.id, payload as any) : await saveManualProfitDistribution(payload as any);
    if (result.success) {
        toast({ title: `تم ${isEditing ? 'تحديث' : 'حفظ'} توزيع الأرباح بنجاح` });
        resetForm();
        onSuccess();
        setOpen(false);
    } else {
        toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
  };

  const handleAddOrUpdatePartner = () => {
    if(!currentPartnerId || !currentPercentage) {
        toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
        return;
    }
    const newPercentage = Number(currentPercentage);
    if (isNaN(newPercentage) || newPercentage <= 0) {
        toast({ title: "النسبة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
        return;
    }
    const currentPartners = getValues('partners') || [];
    const currentTotalPartnerPercentage = currentPartners.filter((_, i) => i !== editingPartnerIndex).reduce((sum, p) => sum + p.percentage, 0);

    if (currentTotalPartnerPercentage + newPercentage > 100) {
         toast({ title: "لا يمكن تجاوز 100%", description: `إجمالي النسب الحالية: ${currentTotalPartnerPercentage.toFixed(2)}%`, variant: 'destructive' });
         return;
    }

    const selectedPartner = allAccountsOptions.find(p => p.value === currentPartnerId);
    if(!selectedPartner) {
         toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
         return;
    }
    const amount = (amountForPartners * newPercentage) / 100;
    const partnerData = { partnerId: selectedPartner.value, partnerName: selectedPartner.label, percentage: newPercentage, amount };

    if (editingPartnerIndex !== null) {
      update(editingPartnerIndex, partnerData);
      setEditingPartnerIndex(null);
    } else {
      append(partnerData);
    }
    
    setCurrentPartnerId('');
    setCurrentPercentage('');
  };
  
  const handleEditPartner = (index: number) => {
    const partnerToEdit = fields[index];
    setEditingPartnerIndex(index);
    setCurrentPartnerId(partnerToEdit.partnerId);
    setCurrentPercentage(partnerToEdit.percentage);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل فترة توزيع أرباح' : 'إضافة توزيع أرباح يدوي'}</DialogTitle>
          <DialogDescription>
             أدخل تفاصيل الفترة وصافي الربح ثم وزع الحصص على الشركاء.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={handleSubmit(handleSave)} className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                <div className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="fromDate" render={({ field }) => ( <FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="toDate" render={({ field }) => ( <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="profit" render={({ field }) => ( <FormItem><FormLabel>صافي الربح للفترة</FormLabel><FormControl><AmountInput currency={watchedCurrency} {...field} onValueChange={(v) => field.onChange(v || 0)}/></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="currency" render={({ field }) => ( 
                        <FormItem><FormLabel>العملة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                              {(navData?.settings.currencySettings?.currencies || []).map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem> 
                    )}/>
                     <div className="md:col-span-2">
                       <FormField control={control} name="sourceAccountId" render={({ field }) => ( <FormItem><FormLabel>مصدر الأرباح</FormLabel><FormControl><Autocomplete options={allAccountsOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر حساب المصدر..."/></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>

                <div className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                        <SummaryStat label="صافي الربح" value={watchedProfit || 0} currency={watchedCurrency} />
                        <SummaryStat label="حصة الروضتين" value={alrawdatainShareAmount} currency={watchedCurrency} />
                        <SummaryStat label="المتاح للشركاء" value={amountForPartners} currency={watchedCurrency} />
                        <SummaryStat label="الموزع للشركاء" value={distributedToPartners} currency={watchedCurrency} />
                        <SummaryStat label="المتبقي للتوزيع" value={remainderForPartners} currency={watchedCurrency} className={cn(Math.abs(remainderForPartners) > 0.01 && 'bg-destructive/10 text-destructive')} />
                    </div>
                     <Separator />
                    <h3 className="font-semibold text-lg my-2">إضافة شريك وتحديد حصته</h3>
                    <div className="flex items-end gap-2 mb-2 p-2 rounded-lg bg-muted/50">
                        <div className="flex-grow space-y-1.5">
                            <Label>الشريك</Label>
                            <Autocomplete options={allAccountsOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريكًا..."/>
                        </div>
                        <div className="w-40 space-y-1.5">
                            <Label>النسبة من حصة الشركاء (%)</Label>
                            <div className="relative">
                                <Input type="text" inputMode="decimal" value={currentPercentage} onChange={(e) => setCurrentPercentage(e.target.value)} placeholder="0.00" className="pe-7"/>
                                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <Button type="button" size="icon" className="shrink-0" onClick={handleAddOrUpdatePartner} disabled={totalPartnerPercentage >= 100}>
                            {editingPartnerIndex !== null ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5"/>}
                        </Button>
                    </div>
                    {totalPartnerPercentage > 100 && (
                        <p className="text-sm text-center text-destructive font-semibold">مجموع نسب الشركاء يتجاوز 100%.</p>
                    )}
                </div>

                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">ملخص التوزيع</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Users className="inline-block me-2 h-4 w-4"/>الشريك</TableHead>
                                <TableHead className="text-center"><Percent className="inline-block me-2 h-4 w-4"/>النسبة</TableHead>
                                <TableHead className="text-right"><Wallet className="inline-block me-2 h-4 w-4"/>المبلغ</TableHead>
                                <TableHead className="w-24 text-center">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow className="bg-green-50 dark:bg-green-900/20">
                                <TableCell className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-green-600"/>حصة الروضتين</TableCell>
                                <TableCell className="text-center">
                                    <div className="relative w-24 mx-auto">
                                        <Controller control={control} name="alrawdatainSharePercentage" render={({field}) => <NumericInput {...field} onValueChange={v => field.onChange(v || 0)} className="pe-7 text-center h-8" />} />
                                        <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold">{alrawdatainShareAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {watchedCurrency}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {fields.map((d, index) => {
                                const amount = (amountForPartners * (d.percentage || 0)) / 100;
                                return (
                                <TableRow key={d.id}>
                                    <TableCell className="font-semibold">{d.partnerName}</TableCell>
                                    <TableCell className="text-center font-mono">{Number(d.percentage).toFixed(2)}%</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {watchedCurrency}</TableCell>
                                    <TableCell className="text-center">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEditPartner(index)}><Edit className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </form>
        </Form>
        <DialogFooter className="pt-4 border-t">
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4"/> <span>{currentUser?.name || '...'}</span></div>
                    <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>{boxName}</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSubmit(handleSave)} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                        {isEditing ? 'حفظ التعديلات' : 'حفظ بيانات الفترة'}
                    </Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
