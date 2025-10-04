
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Save, XCircle, UserSquare, UserRound, Baby, AlertTriangle, Route as RouteIcon, ArrowLeft } from 'lucide-react';
import type { Box, BookingEntry, Passenger, Client, Supplier, User, Currency } from '@/lib/types';
import { addBooking, findBookingByRef } from '@/app/bookings/actions';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AIRPORTS } from '@/lib/airports';


const passengerSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  passportNumber: z.string().optional(),
  ticketNumber: z.string().min(1, "رقم التذكرة مطلوب"),
  purchasePrice: z.coerce.number().min(0, "سعر الشراء يجب أن يكون 0 أو أكثر.").default(0),
  clientStatement: z.string().optional(),
  salePrice: z.coerce.number().min(0, "سعر البيع يجب أن يكون 0 أو أكثر.").default(0),
  passengerType: z.enum(['Adult', 'Child', 'Infant']),
  ticketType: z.enum(['Issue', 'Change', 'Refund', 'Void']).default('Issue'),
});

const bookingSchema = z.object({
  pnr: z.string().min(1, "PNR مطلوب"),
  supplierId: z.string().min(1, "المورد مطلوب"),
  clientId: z.string().min(1, "العميل مطلوب"),
  travelDate: z.date({ required_error: "تاريخ السفر مطلوب" }),
  issueDate: z.date({ required_error: "تاريخ الإصدار مطلوب" }),
  boxId: z.string().optional(),
  currency: z.enum(['USD', 'IQD']),
  passengers: z.array(passengerSchema).min(1, "يجب إضافة مسافر واحد على الأقل"),
  route1: z.string().optional(),
  route2: z.string().optional(),
  route3: z.string().optional(),
  route4: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const passengerTypeOptions: { value: Passenger['passengerType'], label: string, icon: React.ElementType }[] = [
    { value: "Adult", label: "بالغ", icon: UserSquare },
    { value: "Child", label: "طفل", icon: UserRound },
    { value: "Infant", label: "رضيع", icon: Baby },
];


interface InlineNewBookingFormProps {
  onBookingAdded: (newBooking: BookingEntry) => void;
  onCancel: () => void;
}

export default function InlineNewBookingForm({ onBookingAdded, onCancel }: InlineNewBookingFormProps) {
  const { toast } = useToast();
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const { user: currentUser } = useAuth();
  const [duplicatePnrAlert, setDuplicatePnrAlert] = useState<BookingEntry | null>(null);
  const airportOptions = React.useMemo(() => 
    AIRPORTS.map(airport => ({
        value: airport.code,
        label: `${airport.arabicName} (${airport.code})`,
        arabicName: airport.arabicName,
        city: airport.city,
        country: airport.country,
        arabicCountry: airport.arabicCountry,
        useCount: airport.useCount || 0
    })).sort((a,b) => b.useCount - a.useCount), 
  []);

  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      pnr: '',
      supplierId: '',
      clientId: '',
      currency: 'USD',
      passengers: [{
        name: '',
        passportNumber: '',
        ticketNumber: '',
        purchasePrice: 0,
        clientStatement: '',
        salePrice: 0,
        passengerType: 'Adult',
        ticketType: 'Issue',
      }],
    },
  });

  useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId) {
        form.setValue('boxId', currentUser.boxId);
      }
  }, [currentUser, form]);

  const { control, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, getValues } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'passengers',
  });
  
  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);
  const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: `${c.name} ${c.code ? `(${c.code})` : ''}` })), [navData?.clients]);

  const proceedWithSubmit = async (data: BookingFormValues) => {
    const actionToast = toast({ title: "جاري إضافة الحجز..." });
    
    try {
        const route = [data.route1, data.route2, data.route3, data.route4].filter(Boolean).join(' - ');
        const newBookingPayload: Omit<BookingEntry, 'id' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited'> = {
          pnr: data.pnr,
          supplierId: data.supplierId,
          clientId: data.clientId,
          boxId: data.boxId || '',
          currency: data.currency,
          travelDate: data.travelDate.toISOString(),
          issueDate: data.issueDate.toISOString(),
          route: route, 
          notes: '', 
          passengers: data.passengers.map((p) => ({
            id: `temp-${Math.random()}`,
            name: p.name,
            passportNumber: p.passportNumber || '',
            ticketNumber: p.ticketNumber || '',
            purchasePrice: p.purchasePrice,
            salePrice: p.salePrice,
            passengerType: p.passengerType,
            ticketType: 'Issue',
            clientStatement: p.clientStatement || '',
            currency: data.currency,
          })),
        };
    
        const result = await addBooking(newBookingPayload as any);
        
        if (result.success && result.newBooking) {
          actionToast.update({ id: actionToast.id, title: "تمت الإضافة بنجاح" });
          onBookingAdded(result.newBooking);
          form.reset();
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        actionToast.update({ id: actionToast.id, title: "خطأ", description: e.message, variant: 'destructive' });
    }
  }

  const onSubmit = async (data: BookingFormValues) => {
    const existingBookings = await findBookingByRef(data.pnr);
    if (existingBookings && existingBookings.length > 0) {
        setDuplicatePnrAlert(existingBookings[0]);
        return;
    }
    await proceedWithSubmit(data);
  };
  
  if (!isDataLoaded || !navData) {
      return (
          <div className="relative pt-4">
              <Card><CardContent className="pt-6 flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
          </div>
      )
  }

  return (
    <div className='relative pt-4'>
        <Button variant="ghost" size="icon" onClick={onCancel} className="absolute top-0 left-0 z-10"><XCircle className="h-5 w-5"/></Button>
        <AlertDialog open={!!duplicatePnrAlert} onOpenChange={(isOpen) => !isOpen && setDuplicatePnrAlert(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-yellow-500" /> تنبيه: PNR مكرر</AlertDialogTitle>
                    <AlertDialogDescription>
                        رقم الحجز (PNR) الذي أدخلته موجود بالفعل في النظام. هل أنت متأكد أنك تريد المتابعة وإنشاء حجز جديد بنفس الرقم؟
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <p><strong>PNR:</strong> {duplicatePnrAlert?.pnr}</p>
                    <p><strong>تاريخ الإصدار الأصلي:</strong> {duplicatePnrAlert?.issueDate ? format(new Date(duplicatePnrAlert.issueDate), 'yyyy-MM-dd') : 'N/A'}</p>
                    <p><strong>أدخل بواسطة:</strong> {duplicatePnrAlert?.enteredBy}</p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDuplicatePnrAlert(null)}>لا، إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        setDuplicatePnrAlert(null);
                        proceedWithSubmit(getValues());
                    }}>نعم، متابعة على أي حال</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start p-4 border rounded-lg bg-muted/30">
                            <FormField name="pnr" control={control} render={({ field }) => ( <FormItem><Label>رقم PNR</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="supplierId" control={control} render={({ field }) => ( <FormItem><Label>المورد</Label><FormControl><Autocomplete options={supplierOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن مورد..."/></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="clientId" control={control} render={({ field }) => ( <FormItem><Label>العميل</Label><FormControl><Autocomplete options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل..." /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="currency" control={control} render={({ field }) => ( <FormItem><Label>العملة</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField name="travelDate" control={control} render={({ field }) => ( <FormItem><Label>تاريخ السفر</Label><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="issueDate" control={control} render={({ field }) => ( <FormItem><Label>تاريخ الإصدار</Label><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>

                         <div className="space-y-1 p-4 border rounded-lg bg-muted/30">
                            <Label>الروت (خط الرحلة)</Label>
                            <div className="flex items-center gap-1">
                                <RouteIcon className="h-5 w-5 text-muted-foreground"/>
                                <Controller name="route1" control={control} render={({ field }) => (<Autocomplete options={airportOptions} value={field.value} onValueChange={field.onChange} placeholder="BGW"/>)} />
                                <ArrowLeft className="h-5 w-5 text-muted-foreground"/>
                                <Controller name="route2" control={control} render={({ field }) => (<Autocomplete options={airportOptions} value={field.value} onValueChange={field.onChange} placeholder="DXB"/>)} />
                                <ArrowLeft className="h-5 w-5 text-muted-foreground"/>
                                <Controller name="route3" control={control} render={({ field }) => (<Autocomplete options={airportOptions} value={field.value} onValueChange={field.onChange} placeholder="BKK"/>)} />
                                <ArrowLeft className="h-5 w-5 text-muted-foreground"/>
                                <Controller name="route4" control={control} render={({ field }) => (<Autocomplete options={airportOptions} value={field.value} onValueChange={field.onChange} placeholder="..."/>)} />
                            </div>
                        </div>

                        <div className="overflow-x-auto border rounded-lg">
                            <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="p-2 text-right">اسم المسافر</TableHead>
                                    <TableHead className="p-2 text-right">رقم الجواز</TableHead>
                                    <TableHead className="p-2 text-right">رقم التذكرة</TableHead>
                                    <TableHead className="p-2 text-right">سعر الشراء</TableHead>
                                    <TableHead className="p-2 text-right">سعر البيع</TableHead>
                                    <TableHead className="p-2 text-right">نوع المسافر</TableHead>
                                    <TableHead className="p-2 w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const currency = watch(`currency`);
                                    return (
                                        <TableRow key={field.id}>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.name`} control={control} render={({field}) => <FormItem><FormControl><Input {...field} placeholder="الاسم الكامل" /></FormControl><FormMessage/></FormItem>} /></TableCell>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.passportNumber`} control={control} render={({field}) => <FormItem><FormControl><Input {...field} placeholder="رقم الجواز" /></FormControl><FormMessage/></FormItem>} /></TableCell>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.ticketNumber`} control={control} render={({field}) => <FormItem><FormControl><Input {...field} placeholder="رقم التذكرة" /></FormControl><FormMessage/></FormItem>} /></TableCell>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.purchasePrice`} control={control} render={({field}) => <FormItem><FormControl><NumericInput currency={currency} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...field} onValueChange={field.onChange}/></FormControl><FormMessage/></FormItem>} /></TableCell>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.salePrice`} control={control} render={({field}) => <FormItem><FormControl><NumericInput currency={currency} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...field} onValueChange={field.onChange}/></FormControl><FormMessage/></FormItem>} /></TableCell>
                                            <TableCell className="p-1"><FormField name={`passengers.${index}.passengerType`} control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {passengerTypeOptions.map(option => {
                                                                    const Icon = option.icon;
                                                                    return <SelectItem key={option.value} value={option.value}><div className="flex items-center justify-end gap-2"><span>{option.label}</span><Icon className="h-4 w-4"/></div></SelectItem>
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}/></TableCell>
                                            <TableCell className="p-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            </Table>
                             {errors.passengers && typeof errors.passengers === 'object' && 'message' in errors.passengers && <p className="text-sm text-destructive mt-2 p-2">{errors.passengers.message}</p>}
                        </div>

                        <div className="flex justify-between items-center mt-4">
                            <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ 
                                name: '', passportNumber: '', ticketNumber: '', purchasePrice: 0, 
                                clientStatement: '', salePrice: 0, passengerType: 'Adult', ticketType: 'Issue'
                            })}
                            >
                            <PlusCircle className="me-2 h-4 w-4" /> إضافة مسافر
                            </Button>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    <Save className="me-2 h-4 w-4"/>
                                    حفظ الحجز والمسافرين
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}

    

    
