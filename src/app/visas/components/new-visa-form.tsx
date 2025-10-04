

"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Save, Wallet, Hash, User } from 'lucide-react';
import type { Client, Supplier, Box, VisaBookingEntry, Currency, User as CurrentUser } from '@/lib/types';
import { addVisaBooking, updateVisaBooking } from '@/app/visas/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';
import { DialogFooter } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';

const passengerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "الاسم الكامل مطلوب"),
  passportNumber: z.string().optional(),
  applicationNumber: z.string().min(1, "رقم الطلب مطلوب"),
  visaType: z.string().min(1, "نوع الفيزا مطلوب"),
  bk: z.string().optional(),
  purchasePrice: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0, { message: "سعر الشراء يجب أن يكون 0 أو أكثر." }),
  salePrice: z.string().or(z.number()).transform(val => Number(String(val).replace(/,/g, ''))).refine(val => val >= 0, { message: "سعر البيع يجب أن يكون 0 أو أكثر." }),
});

const bookingSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1, "المورد مطلوب"),
  clientId: z.string().min(1, "العميل مطلوب"),
  submissionDate: z.date({ required_error: "تاريخ التقديم مطلوب" }),
  boxId: z.string().min(1, "الصندوق مطلوب"),
  currency: z.enum(['USD', 'IQD']),
  notes: z.string().optional(),
  passengers: z.array(passengerSchema).min(1, "يجب إضافة مسافر واحد على الأقل"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface NewVisaFormProps {
  isEditing?: boolean;
  initialData?: BookingFormValues;
  onBookingAdded?: (newBooking: VisaBookingEntry) => void;
  onBookingUpdated?: (updatedBooking: VisaBookingEntry) => void;
}

export default function NewVisaForm({
    isEditing = false,
    initialData,
    onBookingAdded,
    onBookingUpdated,
}: NewVisaFormProps) {
    
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();
  const { user: currentUser } = useAuth();
  
  const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: c.name })), [navData?.clients]);
  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: isEditing ? initialData : {
      supplierId: '',
      clientId: '',
      submissionDate: new Date(),
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

  React.useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId && !isEditing) {
        form.setValue('boxId', currentUser.boxId);
      }
  }, [currentUser, isEditing, form]);
  
  const { control, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'passengers',
  });
  
  const boxName = React.useMemo(() => {
      const boxId = form.watch('boxId');
      return navData?.boxes?.find(b => b.id === boxId)?.name || 'غير محدد';
  }, [form, navData?.boxes]);


  const onSubmit = async (data: BookingFormValues) => {
    const client = navData?.clients?.find(c => c.id === data.clientId);
    const supplier = navData?.suppliers?.find(s => s.id === data.supplierId);

    const bookingDataPayload = {
      supplierId: data.supplierId,
      clientId: data.clientId,
      supplierName: supplier?.name || data.supplierId,
      clientName: client?.name || data.clientId,
      boxId: data.boxId,
      currency: data.currency,
      submissionDate: data.submissionDate.toISOString(),
      notes: data.notes || '',
      passengers: data.passengers.map((p) => ({
        id: p.id || `temp-${Math.random()}`,
        name: p.name,
        passportNumber: p.passportNumber || '',
        applicationNumber: p.applicationNumber,
        visaType: p.visaType,
        bk: p.bk || '',
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
      })),
    };

    if (isEditing && data.id) {
        const result = await updateVisaBooking(data.id, bookingDataPayload);
        if (result.success && result.updatedBooking) {
            toast({ title: 'تم تحديث الطلب بنجاح' });
            if (onBookingUpdated) {
                onBookingUpdated(result.updatedBooking);
            }
        } else {
             toast({ title: 'خطأ في التحديث', description: result.error, variant: 'destructive' });
        }
    } else {
        const result = await addVisaBooking(bookingDataPayload as any);
        if (result.success && result.newBooking) {
            toast({ title: 'تمت إضافة طلب الفيزا بنجاح' });
            form.reset();
            if (onBookingAdded) {
                onBookingAdded(result.newBooking);
            }
        } else {
            toast({ title: 'خطأ في الإضافة', description: result.error, variant: 'destructive' });
        }
    }
  };

  return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
                <Label htmlFor="supplierId">المورد</Label>
                <Controller name="supplierId" control={control} render={({ field }) => (<Autocomplete options={supplierOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر موردًا..."/>)} />
                {errors.supplierId && <p className="text-sm text-destructive h-4">{errors.supplierId.message}</p>}
            </div>
            <div className="space-y-1">
                <Label htmlFor="clientId">العميل</Label>
                <Controller name="clientId" control={control} render={({ field }) => (<Autocomplete options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر عميلاً..."/>)} />
                {errors.clientId && <p className="text-sm text-destructive h-4">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-1"><Label htmlFor="submissionDate">تاريخ التقديم</Label><Controller name="submissionDate" control={control} render={({ field }) => ( <DateTimePicker date={field.value} setDate={field.onChange} /> )} />{errors.submissionDate && <p className="text-sm text-destructive h-4">{errors.submissionDate.message}</p>}</div>
            <div className="space-y-1">
                <Label htmlFor="currency">العملة</Label>
                <Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select>)} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="boxId">الصندوق</Label>
                <Controller name="boxId" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="اختر صندوق..." /></SelectTrigger><SelectContent>{(navData?.boxes || []).map(box => <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>)}</SelectContent></Select>)} />
                {errors.boxId && <p className="text-sm text-destructive mt-1">{errors.boxId.message}</p>}
            </div>
            <div className="space-y-1"><Label htmlFor="notes">ملاحظات</Label><Controller name="notes" control={control} render={({ field }) => (<Textarea {...field} />)} /></div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="p-2">الاسم الكامل</TableHead>
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
                    <TableCell className="p-1"><Input {...form.register(`passengers.${index}.name`)} placeholder="الاسم الكامل" /></TableCell>
                    <TableCell className="p-1"><Input {...form.register(`passengers.${index}.passportNumber`)} placeholder="رقم الجواز" /></TableCell>
                    <TableCell className="p-1"><Input {...form.register(`passengers.${index}.applicationNumber`)} placeholder="رقم الطلب" /></TableCell>
                    <TableCell className="p-1"><Input {...form.register(`passengers.${index}.visaType`)} placeholder="مثال: سياحية 30 يوم" /></TableCell>
                    <TableCell className="p-1"><Input {...form.register(`passengers.${index}.bk`)} placeholder="BK" /></TableCell>
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

        {/* Actions */}
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
          </div>
          <DialogFooter className="flex-row items-center justify-between sticky bottom-0 bg-background border-t p-2 -mx-6 -mb-6">
            <div></div>
            <div className="flex-grow">
                 <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-primary"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                     <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary"/> <span>الصندوق: {boxName}</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <Button type="button" variant="ghost" onClick={() => form.reset()}>إلغاء</Button>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4"/>
                    {isEditing ? 'حفظ التعديلات' : 'حفظ الطلب'}
                </Button>
            </div>
          </DialogFooter>
      </form>
  );
}
