
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addExchange, updateExchange } from '../actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Exchange } from '@/lib/types';
import { useVoucherNav } from '@/context/voucher-nav-context';

const formSchema = z.object({
  name: z.string().min(2, "اسم البورصة مطلوب."),
  currencyDefault: z.enum(['USD', 'IQD']),
  thresholdAlertUSD: z.coerce.number().min(0).default(0),
  pinnedWhatsappChatId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddExchangeDialogProps {
  onSuccess: () => void;
  children: React.ReactNode;
  isEditing?: boolean;
  exchange?: Exchange;
}

export default function AddExchangeDialog({ onSuccess, children, isEditing = false, exchange }: AddExchangeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && exchange ? exchange : { name: '', currencyDefault: 'USD', thresholdAlertUSD: 100000, pinnedWhatsappChatId: '' }
  });

  useEffect(() => {
      if(open) {
          form.reset(isEditing && exchange ? exchange : { name: '', currencyDefault: 'USD', thresholdAlertUSD: 100000, pinnedWhatsappChatId: '' });
      }
  }, [open, isEditing, exchange, form]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    try {
      const result = isEditing && exchange 
        ? await updateExchange(exchange.id, data)
        : await addExchange(data);
        
      if (result.success) {
        toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} البورصة بنجاح` });
        onSuccess();
        setOpen(false);
        form.reset();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? `تعديل بورصة: ${exchange?.name}` : 'إضافة بورصة جديدة'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل البورصة الجديدة.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>اسم البورصة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="currencyDefault" render={({ field }) => ( <FormItem><FormLabel>العملة الافتراضية</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="thresholdAlertUSD" render={({ field }) => ( <FormItem><FormLabel>حد التنبيه (بالدولار)</FormLabel><FormControl><NumericInput onValueChange={field.onChange} value={field.value} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                {isEditing ? 'حفظ التعديلات' : 'إضافة البورصة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
