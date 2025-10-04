
"use client";

import React, { useState, useEffect } from 'react';
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
import type { Payment, Currency } from '@/lib/types';
import { Loader2, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { updatePayment } from '@/app/subscriptions/actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر."),
  date: z.date({ required_error: "تاريخ الدفع مطلوب" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPaymentDialogProps {
  payment: Payment;
  onPaymentUpdated: () => void;
  children: React.ReactNode;
}

export default function EditPaymentDialog({ payment, onPaymentUpdated, children }: EditPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        amount: payment.amount,
        date: parseISO(payment.date),
        notes: payment.notes || ''
    }
  });

  useEffect(() => {
    if (open) {
        form.reset({
            amount: payment.amount,
            date: parseISO(payment.date),
            notes: payment.notes || ''
        });
    }
  }, [open, payment, form]);

  const { isSubmitting, control, handleSubmit } = form;

  const handleFormSubmit = async (data: FormValues) => {
      const result = await updatePayment(payment.id, {
          ...data,
          date: data.date.toISOString(),
      });

      if (result.success) {
          toast({ title: "تم تحديث الدفعة بنجاح" });
          onPaymentUpdated();
          setOpen(false);
      } else {
           toast({ title: "خطأ", description: result.error, variant: "destructive" });
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الدفعة</DialogTitle>
          <DialogDescription>
            قم بتحديث تفاصيل هذه الدفعة. سيتم تعديل الأرصدة تلقائيًا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={control}
                    name="amount"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>المبلغ</FormLabel>
                            <FormControl>
                                <NumericInput
                                    currency={payment.currency}
                                    value={field.value}
                                    onValueChange={v => field.onChange(v || 0)}
                                />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="date"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>تاريخ الدفع</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                        format(field.value, "yyyy-MM-dd")
                                    ) : (
                                        <span>اختر تاريخًا</span>
                                    )}
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات (اختياري)</FormLabel>
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4"/>}
                        حفظ التعديلات
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
