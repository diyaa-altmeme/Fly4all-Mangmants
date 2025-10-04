
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { BaggagePurchaseEntry, Client, Supplier } from '@/lib/types';
import { Loader2, Calendar as CalendarIcon, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveBaggagePurchase } from '../actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  pnr: z.string().min(1, "PNR مطلوب"),
  supplierId: z.string().min(1, "المورد مطلوب"),
  beneficiaryId: z.string().min(1, "المستفيد مطلوب"),
  purchasePrice: z.coerce.number().min(0, "السعر يجب أن يكون رقمًا موجبًا."),
  salePrice: z.coerce.number().min(0, "السعر يجب أن يكون رقمًا موجبًا."),
  issueDate: z.date({ required_error: "تاريخ الإصدار مطلوب." }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddBaggageFormProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => void;
}

export default function AddBaggageForm({ clients, suppliers, onSuccess }: AddBaggageFormProps) {
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pnr: '',
      supplierId: '',
      beneficiaryId: '',
      purchasePrice: 0,
      salePrice: 0,
      issueDate: new Date(),
      notes: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const payload: Omit<BaggagePurchaseEntry, 'id' | 'invoiceNumber'> = {
      ...data,
      issueDate: format(data.issueDate, 'yyyy-MM-dd'),
      isEntered: false,
      isAudited: false,
      notes: data.notes || '',
    };
    const result = await saveBaggagePurchase(payload);

    if (result.success) {
      toast({ title: 'تمت إضافة الوزن بنجاح' });
      onSuccess();
      form.reset();
    } else {
      toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    }
  };
  
  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="py-4 grid grid-cols-2 gap-4">
          <FormField control={form.control} name="pnr" render={({ field }) => ( <FormItem><FormLabel>PNR</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="issueDate" render={({ field }) => ( <FormItem><FormLabel>تاريخ الإصدار</FormLabel><Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => {field.onChange(d); setIsCalendarOpen(false);}} /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="supplierId" render={({ field }) => ( <FormItem><FormLabel>الجهة المصدرة</FormLabel><FormControl><Autocomplete options={supplierOptions} placeholder="المورد..." value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="beneficiaryId" render={({ field }) => ( <FormItem><FormLabel>الجهة المستفيدة</FormLabel><FormControl><Autocomplete options={clientOptions} placeholder="المستفيد..." value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="purchasePrice" render={({ field }) => ( <FormItem><FormLabel>سعر الشراء</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem> )}/>
          <FormField control={form.control} name="salePrice" render={({ field }) => ( <FormItem><FormLabel>سعر البيع</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem> )}/>
          <div className="col-span-2">
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>ملاحظات</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            <Save className="me-2 h-4 w-4" /> حفظ الوزن
          </Button>
        </div>
      </form>
    </Form>
  );
}
