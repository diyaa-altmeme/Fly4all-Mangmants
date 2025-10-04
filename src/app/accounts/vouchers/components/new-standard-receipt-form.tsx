

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, User as CurrentUser, Box, Client, Supplier } from '@/lib/types';
import { Save, Loader2, Calendar as CalendarIcon, User, Hash, Printer, Wallet } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DialogFooter } from '@/components/ui/dialog';
import { Autocomplete } from '@/components/ui/autocomplete';
import { createStandardReceipt } from '@/app/accounts/vouchers/standard/actions';
import { updateVoucher } from '../list/actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';

const formSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب" }),
  from: z.string().min(1, "اسم الدافع مطلوب"),
  toBox: z.string().min(1, "الصندوق مطلوب"),
  amount: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val > 0, { message: "المبلغ يجب أن يكون أكبر من صفر" }),
  currency: z.enum(['USD', 'IQD']),
  details: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;


interface NewStandardReceiptFormProps {
    onVoucherAdded?: (voucher: any) => void;
    onVoucherUpdated?: (voucher: any) => void;
    selectedCurrency: Currency;
    isEditing?: boolean;
    initialData?: FormValues & { id?: string };
}

const AmountInput = ({ currency, className, ...props }: { currency: Currency, className?: string } & React.ComponentProps<typeof NumericInput>) => (
    <NumericInput 
        currency={currency} 
        className={cn("text-right", className)} 
        currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} 
        {...props} 
    />
);


export default function NewStandardReceiptForm({ onVoucherAdded, selectedCurrency, isEditing, initialData, onVoucherUpdated }: NewStandardReceiptFormProps) {
  const { data: navData } = useVoucherNav();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? initialData : {
      date: new Date(),
      currency: selectedCurrency,
      amount: undefined,
      details: '',
      from: '',
      toBox: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
    },
  });
  
  useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId && !isEditing) {
        form.setValue('toBox', currentUser.boxId);
      }
  }, [currentUser, isEditing, form]);

  const { control, handleSubmit, setValue, register, formState: { errors, isSubmitting }, reset } = form;

  useEffect(() => {
    if (!isEditing) {
        setValue('currency', selectedCurrency);
        setValue('amount', undefined);
    }
  }, [selectedCurrency, setValue, isEditing]);
  
  const boxName = useMemo(() => {
    const boxId = form.watch('toBox');
    return navData?.boxes?.find(b => b.id === boxId)?.name || 'غير محدد';
  }, [form, navData?.boxes]);


  const onSubmit = async (data: FormValues) => {
    const actionToast = toast({ title: `جاري ${isEditing ? 'تحديث' : 'إضافة'} السند...` });

    try {
        if(isEditing && initialData?.id) {
             const result = await updateVoucher(initialData.id, {
                originalData: data,
                date: (data.date as Date).toISOString()
            });
            if (!result.success) throw new Error(result.error);
            if(onVoucherUpdated) onVoucherUpdated(data);
        } else {
            const result = await createStandardReceipt({
                date: format(data.date, 'yyyy-MM-dd'),
                from: data.from,
                toBox: data.toBox,
                amount: data.amount,
                currency: data.currency,
                details: data.details
            });

            if (!result.success) throw new Error(result.error);
            if (onVoucherAdded) onVoucherAdded(data);
            reset();
        }
        actionToast.update({ id: actionToast.id, title: `تم ${isEditing ? 'تحديث' : 'إنشاء'} السند بنجاح` });
    } catch(error: any) {
        actionToast.update({ id: actionToast.id, title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  };

  return (
     <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <div className="p-6 space-y-6 flex-grow">
      
        <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="space-y-1.5">
                <Label htmlFor="date">التاريخ</Label>
                <Controller control={control} name="date" render={({ field }) => (<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="me-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>اختر تاريخ</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => { if(d) field.onChange(d); setIsCalendarOpen(false); }} initialFocus /></PopoverContent></Popover>)} />
                {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="from">استلام من</Label>
                 <Controller name="from" control={control} render={({ field }) => ( <Autocomplete searchAction="all" value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل أو مورد..." /> )}/>
                {errors.from && <p className="text-destructive text-sm mt-1">{errors.from.message}</p>}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="toBox">إيداع في صندوق</Label>
                <Controller name="toBox" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="اختر صندوق..." /></SelectTrigger><SelectContent>{(navData?.boxes || []).map(box => <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>)}</SelectContent></Select>)} />
                {errors.toBox && <p className="text-destructive text-sm mt-1">{errors.toBox.message}</p>}
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="amount">المبلغ المستلم</Label>
                <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                        <AmountInput currency={selectedCurrency} {...field} onValueChange={field.onChange} />
                    )}
                />
                {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
            </div>
        </div>
        
        <div className="space-y-1.5">
            <Label htmlFor="details">تفاصيل إضافية / البيان</Label>
            <Textarea id="details" {...register('details')} />
            {errors.details && <p className="text-destructive text-sm mt-1">{errors.details.message}</p>}
        </div>

      </div>
      
      <DialogFooter className="p-4 border-t bg-background sticky bottom-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                 <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>الصندوق: {boxName}</span></div>
                <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
            </div>
             <div className="flex items-center gap-2">
                <Button type="button" onClick={() => {}} variant="outline" disabled={isSubmitting}>
                    <Printer className="me-2 h-4 w-4" />
                    حفظ وطباعة
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    {isEditing ? 'حفظ التعديلات' : 'حفظ السند'}
                </Button>
            </div>
        </div>
      </DialogFooter>
    </form>
  );
}
