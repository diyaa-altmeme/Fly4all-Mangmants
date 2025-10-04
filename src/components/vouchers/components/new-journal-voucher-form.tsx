

"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Currency, User as CurrentUser } from '@/lib/types';
import { Save, Loader2, Calendar as CalendarIcon, User, Hash, PlusCircle, Trash2, Scale, Printer } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/auth-context';
import { Autocomplete } from '@/components/ui/autocomplete';
import { createJournalVoucher } from '@/app/accounts/vouchers/journal/actions';
import { updateVoucher } from '@/app/accounts/vouchers/list/actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';

const entrySchema = z.object({
    accountId: z.string().min(1, "الحساب مطلوب"),
    debit: z.coerce.number().min(0).default(0),
    credit: z.coerce.number().min(0).default(0),
});

const formSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب" }),
  currency: z.enum(['USD', 'IQD']),
  notes: z.string().min(1, "بيان القيد مطلوب"),
  exchangeRate: z.coerce.number().optional(),
  entries: z.array(entrySchema).min(2, "يجب وجود حركتين على الأقل (مدين ودائن).")
});

type FormValues = z.infer<typeof formSchema>;


interface NewJournalVoucherFormProps {
    onVoucherAdded?: (voucher: any) => void;
    onVoucherUpdated?: (voucher: any) => void;
    selectedCurrency: Currency;
    isEditing?: boolean;
    initialData?: FormValues & { id?: string };
}

const AmountInput = ({ ...props }: React.ComponentProps<typeof NumericInput>) => (
    <div className="relative">
        <NumericInput placeholder="0.00" {...props} />
    </div>
);


export default function NewJournalVoucherForm({ onVoucherAdded, onVoucherUpdated, isEditing, initialData, selectedCurrency }: NewJournalVoucherFormProps) {
  
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const { data: navData } = useVoucherNav();
  
  const accountOptions = React.useMemo(() => {
    if (!navData) return [];
    return [
      ...(navData.clients || []).map(c => ({ value: c.id, label: `عميل: ${c.name}` })),
      ...(navData.suppliers || []).map(s => ({ value: s.id, label: `مورد: ${s.name}` })),
      ...(navData.boxes || []).map(b => ({ value: b.id, label: `صندوق: ${b.name}` }))
    ];
  }, [navData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? initialData : {
      date: new Date(),
      currency: selectedCurrency,
      notes: '',
      entries: [
          { accountId: '', debit: 0, credit: 0 },
          { accountId: '', debit: 0, credit: 0 },
      ]
    },
  });
  
  const { control, handleSubmit, setValue, watch, register, formState: { errors, isSubmitting }, reset } = form;

  const { fields, append, remove } = useFieldArray({
      control,
      name: "entries"
  });

   const watchedEntries = watch("entries");
   const totalDebit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0);
   const totalCredit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.credit) || 0), 0);
   const balance = totalDebit - totalCredit;

  useEffect(() => {
    if (!isEditing) {
        setValue('currency', selectedCurrency);
        setValue('entries', [{ accountId: '', debit: undefined, credit: undefined }, { accountId: '', debit: undefined, credit: undefined }] as any);
    }
  }, [selectedCurrency, setValue, isEditing]);

  const onSubmit = async (data: FormValues) => {
    if (Math.abs(balance) > 0.01) { // Use tolerance for floating point
        toast({ title: "القيد غير متوازن", description: "مجموع المدين يجب أن يساوي مجموع الدائن.", variant: "destructive" });
        return;
    }

     try {
        if (isEditing && initialData?.id) {
             const result = await updateVoucher(initialData.id, {
                ...data,
                date: (data.date as Date).toISOString() // Ensure date is stringified
            });
            if (result.success) {
                toast({ title: 'تم تحديث السند بنجاح' });
                 if (onVoucherUpdated) onVoucherUpdated({});
            } else {
                 toast({ title: "خطأ في التحديث", description: result.error, variant: 'destructive' });
            }
        } else {
            const result = await createJournalVoucher({
                date: format(data.date, 'yyyy-MM-dd'),
                currency: data.currency,
                notes: data.notes,
                exchangeRate: data.exchangeRate,
                entries: data.entries,
            });

            if (result.success) {
                toast({ title: "تم إنشاء القيد المحاسبي بنجاح" });
                if(onVoucherAdded) onVoucherAdded({});
                reset();
            } else {
                throw new Error(result.error);
            }
        }
    } catch(error: any) {
         toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  };
  
  return (
     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
       <div className="p-6 space-y-6 flex-grow">
            <div className="grid md:grid-cols-2 gap-6 items-start">
                 <div className="space-y-1.5">
                    <Label htmlFor="date">التاريخ</Label>
                    <Controller control={control} name="date" render={({ field }) => ( <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'yyyy-MM-dd') : <span>اختر تاريخ</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsCalendarOpen(false);}} /></PopoverContent></Popover>)} />
                    {errors.date && <p className="text-sm text-destructive h-4">{errors.date.message}</p>}
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="notes">البيان / السبب</Label>
                    <Textarea id="notes" placeholder="أضف شرحًا لسبب القيد..." {...register('notes')} />
                    {errors.notes && <p className="text-sm text-destructive h-4">{errors.notes.message}</p>}
                </div>
                 {selectedCurrency === 'USD' && (
                   <div className="space-y-1.5">
                        <Label htmlFor="exchangeRate">سعر الصرف (مقابل الدينار)</Label>
                         <Controller
                            name="exchangeRate"
                            control={control}
                            render={({ field }) => <NumericInput placeholder="0.00" {...field} onValueChange={field.onChange} />}
                        />
                   </div>
                )}
            </div>

            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h4 className="font-semibold">حركات القيد</h4>
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: '', debit: undefined, credit: undefined } as any)}>
                        <PlusCircle className="me-2 h-4 w-4" /> إضافة حركة
                    </Button>
                </div>
                {fields.map((field, index) => (
                     <div key={field.id} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center border p-2 rounded-lg">
                        <Controller name={`entries.${index}.accountId`} control={control} render={({ field }) => (
                           <Autocomplete
                                searchAction="all"
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="ابحث عن حساب..."
                            />
                        )} />
                        <Controller name={`entries.${index}.debit`} control={control} render={({ field }) => <AmountInput placeholder="المدين" className="w-28" {...field} onValueChange={field.onChange} />} />
                        <Controller name={`entries.${index}.credit`} control={control} render={({ field }) => <AmountInput placeholder="الدائن" className="w-28" {...field} onValueChange={field.onChange} />} />
                         <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)} disabled={fields.length <= 2}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 {errors.entries && <p className="text-sm text-destructive">{errors.entries.message || (errors.entries as any)?.root?.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                 <div className="text-center">
                    <Label>إجمالي المدين</Label>
                    <p className="font-bold text-lg text-green-600">{totalDebit.toFixed(2)}</p>
                </div>
                 <div className="text-center">
                    <Label>إجمالي الدائن</Label>
                     <p className="font-bold text-lg text-red-600">{totalCredit.toFixed(2)}</p>
                </div>
                 <div className={cn("text-center transition-colors", balance !== 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    <Label>الفرق (التوازن)</Label>
                     <p className="font-bold text-lg flex items-center justify-center gap-2">
                        <Scale className="h-5 w-5"/>
                        {balance.toFixed(2)}
                     </p>
                </div>
            </div>
        </div>
        
         <DialogFooter className="p-4 border-t bg-background sticky bottom-0">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم القيد: (تلقائي)</span></div>
                </div>
                 <div className="flex gap-2">
                    <Button type="button" onClick={() => {}} variant="outline" disabled={isSubmitting}>
                        <Printer className="me-2 h-4 w-4" />
                        حفظ وطباعة
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4" />
                        {isEditing ? 'حفظ التعديلات' : 'حفظ القيد'}
                    </Button>
                </div>
            </div>
         </DialogFooter>
    </form>
  );
}
