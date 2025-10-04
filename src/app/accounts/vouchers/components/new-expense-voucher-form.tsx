
"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, User as CurrentUser, Box } from '@/lib/types';
import { Save, Loader2, Calendar as CalendarIcon, User, Hash, Printer } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/auth-context';
import { createExpenseVoucher } from '@/app/accounts/vouchers/expense/actions';
import { updateVoucher } from '../list/actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  date: z.date({ required_error: "التاريخ مطلوب" }),
  expenseType: z.string().min(1, "نوع المصروف مطلوب"),
  amount: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val > 0, { message: "المبلغ يجب أن يكون أكبر من صفر" }),
  currency: z.enum(['USD', 'IQD']),
  payee: z.string().optional(),
  boxId: z.string().min(1, "الصندوق مطلوب"),
  notes: z.string().optional(),
  exchangeRate: z.coerce.number().optional(),
  attachments: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;


interface NewExpenseVoucherFormProps {
    boxes: Box[];
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


export default function NewExpenseVoucherForm({ boxes, onVoucherAdded, selectedCurrency, onVoucherUpdated, isEditing, initialData }: NewExpenseVoucherFormProps) {
  
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { user: currentUser } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? initialData : {
      date: new Date(),
      currency: selectedCurrency,
      amount: 0,
      notes: '',
      payee: '',
      boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
    },
  });
  
  useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId && !isEditing) {
        form.setValue('boxId', currentUser.boxId);
      }
  }, [currentUser, isEditing, form]);

  const { control, handleSubmit, setValue, register, formState: { errors, isSubmitting }, reset } = form;

  useEffect(() => {
    if(!isEditing) {
        setValue('currency', selectedCurrency);
        setValue('amount', 0);
    }
  }, [selectedCurrency, setValue, isEditing]);

  const onSubmit = async (data: FormValues) => {
    try {
        if(isEditing && initialData?.id) {
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
            const result = await createExpenseVoucher({
                date: format(data.date, 'yyyy-MM-dd'),
                expenseType: data.expenseType,
                amount: data.amount,
                currency: data.currency,
                boxId: data.boxId,
                notes: data.notes,
                payee: data.payee,
                exchangeRate: data.exchangeRate
            });

            if (result.success) {
                toast({ title: "تم تسجيل المصروف بنجاح" });
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
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="date">التاريخ</Label>
                        <Controller control={control} name="date" render={({ field }) => ( <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'yyyy-MM-dd') : <span>اختر تاريخ</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsCalendarOpen(false);}} /></PopoverContent></Popover>)} />
                        {errors.date && <p className="text-sm text-destructive h-4">{errors.date.message}</p>}
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="payee">الجهة المستفيدة (اختياري)</Label>
                        <Input id="payee" placeholder="مثال: موظف، شركة الكهرباء..." {...register('payee')} />
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="notes">التفاصيل / الملاحظات</Label>
                        <Textarea id="notes" placeholder="أضف تفاصيل إضافية هنا..." {...register('notes')} />
                    </div>
                 </div>
                 <div className="space-y-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="expenseType">نوع المصروف</Label>
                        <Controller name="expenseType" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="expenseType"><SelectValue placeholder="اختر نوع المصروف..." /></SelectTrigger><SelectContent><SelectItem value="salaries">رواتب</SelectItem><SelectItem value="rent">إيجار</SelectItem><SelectItem value="utilities">فواتير وخدمات</SelectItem><SelectItem value="supplies">قرطاسية ومستلزمات</SelectItem></SelectContent></Select>)} />
                        {errors.expenseType && <p className="text-sm text-destructive">{errors.expenseType.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="boxId">الصندوق</Label>
                        <Controller name="boxId" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="boxId"><SelectValue placeholder="اختر الصندوق..." /></SelectTrigger><SelectContent>{boxes.map(box => <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>)}</SelectContent></Select>)} />
                        {errors.boxId && <p className="text-sm text-destructive">{errors.boxId.message}</p>}
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="amount">المبلغ</Label>
                        <Controller
                            name="amount"
                            control={control}
                            render={({ field }) => <AmountInput currency={selectedCurrency} {...field} onValueChange={field.onChange}/>}
                        />
                        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>
                    {selectedCurrency === 'USD' && (
                       <div className="space-y-1.5">
                            <Label htmlFor="exchangeRate">سعر الصرف (مقابل الدينار)</Label>
                            <Controller
                                name="exchangeRate"
                                control={control}
                                render={({ field }) => <AmountInput currency="IQD" {...field} onValueChange={field.onChange} />}
                            />
                       </div>
                    )}
                 </div>
            </div>
       </div>
        
        <DialogFooter className="p-4 border-t bg-background sticky bottom-0">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                </div>
                <div className="flex gap-2">
                    <Button type="button" onClick={() => {}} variant="outline" disabled={isSubmitting}>
                        <Printer className="me-2 h-4 w-4" />
                        حفظ وطباعة
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4" />
                        {isEditing ? 'حفظ التعديلات' : 'حفظ سند المصاريف'}
                    </Button>
                </div>
            </div>
        </DialogFooter>
    </form>
  );
}
