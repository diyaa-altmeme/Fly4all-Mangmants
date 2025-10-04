
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
import { type ProfitShare, saveProfitShare, updateProfitShare } from "../actions";
import { Loader2, Save, Percent, Edit, PlusCircle, Trash2, CalendarIcon, Wallet, Landmark, Users, ArrowLeft } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { saveManualProfitDistribution } from "@/app/profits/manual/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Currency } from "@/lib/types";
import { Label } from "@/components/ui/label";

const partnerSchema = z.object({
  id: z.string().min(1, "اسم الشريك مطلوب."),
  name: z.string(),
  percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا تتجاوز 100."),
});

const formSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب" }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب" }),
  profit: z.coerce.number().positive("الربح يجب أن يكون أكبر من صفر").or(z.literal('')),
  currency: z.enum(['USD', 'IQD']),
  partners: z.array(partnerSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;
export type PartnerShare = z.infer<typeof partnerSchema> & { amount: number };

interface AddManualProfitDialogProps {
  partners: { id: string; name: string }[];
  onSuccess: () => void;
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


export default function AddManualProfitDialog({ partners: partnersFromProps, onSuccess }: AddManualProfitDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const [currentPercentage, setCurrentPercentage] = useState<number | string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profit: '',
      currency: 'USD',
      partners: [],
    },
  });

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting }, trigger, reset: resetForm } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "partners",
  });
  
  const partnerOptions = useMemo(() => {
    return partnersFromProps.map(p => ({ value: p.id, label: p.name }));
  }, [partnersFromProps]);

  const watchedPartners = watch('partners');
  const watchedProfit = watch('profit');
  const watchedCurrency = watch('currency');

  useEffect(() => {
    if (open) {
      resetForm({ profit: '', currency: 'USD', partners: [] });
      setCurrentPartnerId('');
      setCurrentPercentage('');
      setStep(1);
    }
  }, [open, resetForm]);

  const totalPartnerPercentage = useMemo(() => 
      (watchedPartners || []).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0), 
  [watchedPartners]);

  const remainingPercentage = 100 - totalPartnerPercentage;

  const distribution = useMemo(() => {
    const calculatedPartners: PartnerShare[] = (watchedPartners || []).map(p => {
         const partnerInfo = partnersFromProps.find(opt => opt.id === p.id);
         return {
            ...p,
            name: partnerInfo?.name || p.name,
            amount: ((Number(watchedProfit) || 0) * (p.percentage || 0)) / 100
         }
    });
    
    if (remainingPercentage > 0) {
        calculatedPartners.push({
            id: 'alrawdatain',
            name: 'الروضتين',
            percentage: remainingPercentage,
            amount: ((Number(watchedProfit) || 0) * remainingPercentage) / 100
        });
    }

    return calculatedPartners;
  }, [watchedPartners, watchedProfit, remainingPercentage, partnersFromProps]);

  const goToNextStep = async () => {
    const isValid = await trigger(['fromDate', 'toDate', 'profit', 'currency']);
    if (isValid) setStep(2);
  };
  
  const handleSave = async (data: FormValues) => {
    if (totalPartnerPercentage > 100) {
        toast({ title: "خطأ", description: "مجموع نسب الشركاء لا يمكن أن يتجاوز 100%", variant: "destructive" });
        return;
    }

    const payload = {
        fromDate: format(data.fromDate, 'yyyy-MM-dd'),
        toDate: format(data.toDate, 'yyyy-MM-dd'),
        profit: data.profit,
        currency: data.currency,
        partners: distribution.map(({ id, name, percentage, amount }) => ({ id, name, percentage, amount })),
    };
    
    const result = await saveManualProfitDistribution(payload as any);
    if (result.success) {
        toast({ title: "تم حفظ توزيع الأرباح بنجاح" });
        resetForm();
        onSuccess();
        setOpen(false);
    } else {
        toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
  };

  const onAddPartner = () => {
      if(!currentPartnerId || !currentPercentage) {
          toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
          return;
      }
      const newPercentage = Number(currentPercentage);
      if (isNaN(newPercentage) || newPercentage <= 0) {
          toast({ title: "النسبة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
          return;
      }
      if (totalPartnerPercentage + newPercentage > 100) {
           toast({ title: "لا يمكن تجاوز 100%", description: `النسبة المتبقية المتاحة هي: ${remainingPercentage.toFixed(2)}%`, variant: 'destructive' });
           return;
      }

      const selectedPartner = partnersFromProps.find(p => p.id === currentPartnerId);
      if(!selectedPartner) {
           toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
           return;
      }
      const newPartner = { id: selectedPartner.id, name: selectedPartner.name, percentage: newPercentage };
      append(newPartner);
      setCurrentPartnerId('');
      setCurrentPercentage('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Edit className="me-2 h-4 w-4"/>
          إدخال أرباح فترة يدوية
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>إدخال توزيع أرباح يدوي</DialogTitle>
          <DialogDescription>
             {step === 1 ? "الخطوة 1: أدخل تفاصيل الفترة وصافي الربح." : "الخطوة 2: وزع الحصص على الشركاء. النظام سيحسب المبالغ تلقائيًا."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={handleSubmit(handleSave)} className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
              {step === 1 && (
                  <div className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="fromDate" render={({ field }) => ( <FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="toDate" render={({ field }) => ( <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="profit" render={({ field }) => ( <FormItem><FormLabel>صافي الربح للفترة</FormLabel><FormControl><AmountInput currency={watchedCurrency} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={control} name="currency" render={({ field }) => ( <FormItem><FormLabel>العملة</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                  </div>
              )}
              {step === 2 && (
                  <>
                      <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold text-lg mb-2">إضافة شريك وتحديد حصته</h3>
                          <div className="flex items-end gap-2 mb-2 p-2 rounded-lg bg-muted/50">
                                <div className="flex-grow space-y-1.5">
                                    <Label>الشريك</Label>
                                    <Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريكًا..."/>
                                </div>
                                <div className="w-40 space-y-1.5">
                                    <Label>النسبة</Label>
                                    <div className="relative">
                                        <Input type="text" inputMode="decimal" value={currentPercentage} onChange={(e) => setCurrentPercentage(e.target.value)} placeholder="0.00" className="pe-7"/>
                                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <Button type="button" size="icon" className="shrink-0" onClick={onAddPartner} disabled={totalPartnerPercentage >= 100}>
                                    <PlusCircle className="h-5 w-5"/>
                                </Button>
                          </div>
                          {totalPartnerPercentage >= 100 && (
                            <p className="text-sm text-center text-destructive font-semibold">تم توزيع 100% من الأرباح. لا يمكن إضافة المزيد.</p>
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
                                      <TableHead className="w-12 text-center">حذف</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {distribution.map((d, index) => (
                                      <TableRow key={`${d.id}-${index}`} className={d.id === 'alrawdatain' ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                                          <TableCell className="font-semibold flex items-center gap-2">
                                              {d.id === 'alrawdatain' && <Landmark className="h-4 w-4 text-green-600"/>}
                                              {d.name}
                                          </TableCell>
                                          <TableCell className="text-center font-mono">{Number(d.percentage).toFixed(2)}%</TableCell>
                                          <TableCell className="text-right font-mono font-bold">{d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {watchedCurrency}</TableCell>
                                           <TableCell className="text-center">
                                            {d.id !== 'alrawdatain' && (
                                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(fields.findIndex(f => f.id === d.id))}>
                                                  <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                  </>
              )}
            </form>
        </Form>
        <DialogFooter className="pt-4 border-t">
          {step === 1 && <Button onClick={goToNextStep}>التالي</Button>}
          {step === 2 && (
              <div className="flex justify-between w-full">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="me-2 h-4 w-4"/> رجوع</Button>
                  <Button onClick={handleSubmit(handleSave)} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                      حفظ بيانات الفترة
                  </Button>
              </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
