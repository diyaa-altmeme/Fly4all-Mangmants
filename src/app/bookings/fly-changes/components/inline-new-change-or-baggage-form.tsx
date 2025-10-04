
"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Loader2, Save, XCircle } from 'lucide-react';
import type { Client, Supplier } from '@/lib/types';
import { saveFlyChange, saveBaggagePurchase } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const formSchema = z.object({
  pnr: z.string().min(1, "PNR مطلوب"),
  supplierId: z.string().min(1, "المورد مطلوب"),
  beneficiaryId: z.string().min(1, "المستفيد مطلوب"),
  purchasePrice: z.coerce.number().min(0, "السعر يجب أن يكون رقمًا موجبًا."),
  salePrice: z.coerce.number().min(0, "السعر يجب أن يكون رقمًا موجبًا."),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InlineNewFormProps {
  type: 'change' | 'baggage';
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InlineNewChangeOrBaggageForm({ type, clients, suppliers, onSuccess, onCancel }: InlineNewFormProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { pnr: '', supplierId: '', beneficiaryId: '', purchasePrice: 0, salePrice: 0, notes: '' },
  });

  const { handleSubmit, control, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      isEntered: false,
      isAudited: false,
      notes: data.notes || 'إدخال سريع',
    };
    
    const action = type === 'change' ? saveFlyChange : saveBaggagePurchase;
    const result = await action(payload);

    if (result.success) {
      toast({ title: `تمت إضافة ${type === 'change' ? 'التغيير' : 'الوزن'} بنجاح` });
      form.reset();
      onSuccess();
    } else {
      toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    }
  };

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="relative pt-4">
      <Button variant="ghost" size="icon" onClick={onCancel} className="absolute top-0 left-0 z-10"><XCircle className="h-5 w-5" /></Button>
      <Card>
        <CardHeader className="pt-6 pb-2">
            <CardTitle className="text-lg">إضافة {type === 'change' ? 'تغيير' : 'وزن'} سريع</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    <FormField control={control} name="pnr" render={({ field }) => (<FormItem><FormLabel>PNR</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={control} name="supplierId" render={({ field }) => (<FormItem><FormLabel>الجهة المصدرة</FormLabel><FormControl><Autocomplete options={supplierOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر موردًا..." /></FormControl></FormItem>)} />
                    <FormField control={control} name="beneficiaryId" render={({ field }) => (<FormItem><FormLabel>الجهة المستفيدة</FormLabel><FormControl><Autocomplete options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر مستفيد..." /></FormControl></FormItem>)} />
                    <FormField control={control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>سعر الشراء</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="0.00" {...field} /></FormControl></FormItem>)} />
                    <FormField control={control} name="salePrice" render={({ field }) => (<FormItem><FormLabel>سعر البيع</FormLabel><FormControl><Input type="text" inputMode="decimal" placeholder="0.00" {...field} /></FormControl></FormItem>)} />
                    <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-start text-destructive text-sm">
                    {errors.pnr && <p>{errors.pnr.message}</p>}
                    {errors.supplierId && <p>{errors.supplierId.message}</p>}
                    {errors.beneficiaryId && <p>{errors.beneficiaryId.message}</p>}
                    {errors.purchasePrice && <p>{errors.purchasePrice.message}</p>}
                    {errors.salePrice && <p>{errors.salePrice.message}</p>}
                 </div>
                 <div className="flex justify-end">
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        حفظ {type === 'change' ? 'التغيير' : 'الوزن'}
                    </Button>
                 </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
