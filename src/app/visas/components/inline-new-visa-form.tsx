
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Save, XCircle } from 'lucide-react';
import type { Box, VisaBookingEntry, Passenger, Client, Supplier, User, Currency } from '@/lib/types';
import { addVisaBooking } from '@/app/visas/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';
import { NumericInput } from '@/components/ui/numeric-input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const passengerSchema = z.object({
  name: z.string().min(1, "الاسم الكامل مطلوب"),
  passportNumber: z.string().optional(),
  applicationNumber: z.string().optional(),
  visaType: z.string().min(1, "نوع الفيزا مطلوب"),
  bk: z.string().optional(),
  purchasePrice: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0),
  salePrice: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0),
});

const bookingSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  clientId: z.string().min(1, "العميل مطلوب"),
  submissionDate: z.date({ required_error: "تاريخ التقديم مطلوب" }),
  boxId: z.string().min(1, "الصندوق مطلوب"),
  currency: z.enum(['USD', 'IQD']),
  notes: z.string().optional(),
  passengers: z.array(passengerSchema).min(1, "يجب إضافة مسافر واحد على الأقل"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface InlineNewVisaFormProps {
  onBookingAdded: (newBooking: VisaBookingEntry) => void;
  onCancel: () => void;
}

export default function InlineNewVisaForm({ onBookingAdded, onCancel }: InlineNewVisaFormProps) {
  const { toast } = useToast();
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const { user: currentUser } = useAuth();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      supplierId: '',
      clientId: '',
      boxId: '',
      currency: 'USD',
      notes: '',
      passengers: [{
        name: '',
        passportNumber: '',
        applicationNumber: '',
        visaType: '',
        bk: '',
        purchasePrice: 0,
        salePrice: 0,
      }],
    },
  });

  const { control, handleSubmit, formState: { errors, isSubmitting }, register, setValue, watch } = form;
  
   useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId) {
        setValue('boxId', currentUser.boxId);
      }
  }, [currentUser, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'passengers',
  });
  
  const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: `${c.name} ${c.code ? `(${c.code})` : ''}` })), [navData?.clients]);
  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);

  const onSubmit = async (data: BookingFormValues) => {
    const actionToast = toast({ title: "جاري إضافة طلب الفيزا..." });
    onBookingAdded(data as any); // Optimistic update
    
    try {
      const newBookingPayload: Omit<VisaBookingEntry, 'id' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited'> = {
        invoiceNumber: `#V${Date.now()}`,
        supplierId: data.supplierId,
        clientId: data.clientId,
        boxId: data.boxId,
        currency: data.currency,
        submissionDate: format(data.submissionDate, 'yyyy-MM-dd hh:mm a'),
        notes: data.notes || '', 
        passengers: data.passengers.map((p) => ({
          id: `temp-${Math.random()}`,
          name: p.name,
          passportNumber: p.passportNumber || '',
          applicationNumber: p.applicationNumber || '',
          visaType: p.visaType,
          bk: p.bk || '',
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
        })),
      };

      const result = await addVisaBooking(newBookingPayload);
      
      if (result.success && result.newBooking) {
        actionToast.update({ id: actionToast.id, title: "تمت الإضافة بنجاح" });
        form.reset();
      } else {
          throw new Error(result.error);
      }
    } catch (e: any) {
        actionToast.update({ id: actionToast.id, title: "خطأ", description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className='relative pt-4'>
        <Button variant="ghost" size="icon" onClick={onCancel} className="absolute top-0 left-0 z-10"><XCircle className="h-5 w-5"/></Button>
        <Card>
            <CardHeader><CardTitle>إضافة سريعة لطلب فيزا</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                            <Label htmlFor="supplierId">المورد</Label>
                            <Controller name="supplierId" control={control} render={({ field }) => (<Autocomplete options={supplierOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر موردًا..."/>)} />
                            {errors.supplierId && <p className="text-sm text-destructive h-4">{errors.supplierId.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="clientId">العميل</Label>
                             <Controller name="clientId" control={control} render={({ field }) => ( <Autocomplete options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر عميلاً..." /> )}/>
                            {errors.clientId && <p className="text-sm text-destructive h-4">{errors.clientId.message}</p>}
                        </div>
                        <div className="space-y-1"><Label htmlFor="submissionDate">تاريخ التقديم</Label><Controller name="submissionDate" control={control} render={({ field }) => ( <DateTimePicker date={field.value} setDate={field.onChange} />)} />{errors.submissionDate && <p className="text-sm text-destructive h-4">{errors.submissionDate.message}</p>}</div>
                         <div className="space-y-1">
                            <Label htmlFor="currency">العملة</Label>
                             <Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select>)} />
                        </div>
                         <div className="space-y-1"><Label htmlFor="notes">البيان (اختياري)</Label><Input id="notes" {...register('notes')} className="font-bold"/></div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="p-2">الاسم</TableHead>
                                <TableHead className="p-2">رقم الجواز</TableHead>
                                <TableHead className="p-2">رقم الطلب</TableHead>
                                <TableHead className="p-2">نوع الفيزا</TableHead>
                                <TableHead className="p-2">BK</TableHead>
                                <TableHead className="p-2">سعر الشراء</TableHead>
                                <TableHead className="p-2">سعر البيع</TableHead>
                                <TableHead className="p-2 w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const currency = watch('currency');
                                return (
                                <TableRow key={field.id}>
                                    <TableCell className="p-1"><Input {...register(`passengers.${index}.name`)} placeholder="الاسم الكامل" className="font-bold" /></TableCell>
                                    <TableCell className="p-1"><Input {...register(`passengers.${index}.passportNumber`)} placeholder="رقم الجواز" className="font-bold" /></TableCell>
                                    <TableCell className="p-1"><Input {...register(`passengers.${index}.applicationNumber`)} placeholder="رقم الطلب" className="font-bold" /></TableCell>
                                    <TableCell className="p-1"><Input {...register(`passengers.${index}.visaType`)} placeholder="مثال: سياحية 30 يوم" className="font-bold" /></TableCell>
                                    <TableCell className="p-1"><Input {...register(`passengers.${index}.bk`)} placeholder="BK" className="font-bold" /></TableCell>
                                    <TableCell className="p-1"><Controller name={`passengers.${index}.purchasePrice`} control={control} render={({ field }) => <NumericInput currency={currency} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...field} onValueChange={field.onChange} />} /></TableCell>
                                    <TableCell className="p-1"><Controller name={`passengers.${index}.salePrice`} control={control} render={({ field }) => <NumericInput currency={currency} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...field} onValueChange={field.onChange} />} /></TableCell>
                                    <TableCell className="p-1">
                                    <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                        </Table>
                         {errors.passengers && typeof errors.passengers === 'object' && 'message' in errors.passengers && <p className="text-sm text-destructive mt-2 p-2">{errors.passengers.message}</p>}
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ 
                            name: '', passportNumber: '', applicationNumber: '', visaType: '', bk: '', purchasePrice: 0, salePrice: 0
                        })}
                        >
                        <PlusCircle className="me-2 h-4 w-4" /> إضافة مسافر
                        </Button>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                <Save className="me-2 h-4 w-4"/>
                                حفظ الطلب
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
