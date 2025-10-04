
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Save, XCircle, UserSquare, UserRound, Baby, AlertTriangle, Route as RouteIcon, ArrowLeft, Building, User, Wallet, Hash, TextareaIcon, Percent, DollarSign, X, Plane, Edit, Printer, Search, FileText } from 'lucide-react';
import type { Box, BookingEntry, Passenger, Client, Supplier, User as CurrentUser, Currency, PricingRule } from '@/lib/types';
import { addBooking, findBookingByRef, updateBooking } from '@/app/bookings/actions';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';
import { Form, FormControl, FormField, FormMessage, FormLabel, FormItem } from "@/components/ui/form";
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const Section = ({ title, children, className }: { title: React.ReactNode; children: React.ReactNode, className?: string }) => (
    <div className={cn("relative p-4 border rounded-lg mt-6", className)}>
        <h3 className="absolute -top-3 right-4 bg-background px-2 text-base font-bold text-primary">
            {title}
        </h3>
        {children}
    </div>
);


const passengerSchema = z.object({
  id: z.string().optional(),
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
  vl: z.string().optional(),
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
  carrier: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;


const passengerTypeOptions: { value: Passenger['passengerType'], label: string, icon: React.ElementType }[] = [
    { value: "Adult", label: "بالغ", icon: UserSquare },
    { value: "Child", label: "طفل", icon: UserRound },
    { value: "Infant", label: "رضيع", icon: Baby },
];

const airportOptions = AIRPORTS.map(airport => ({
    value: airport.code,
    label: `${''}${airport.arabicName} (${''}${airport.code})`
}));

export default function NewBookingForm({ onBookingAdded, isEditing, initialData, onBookingUpdated }: { onBookingAdded?: (data: any) => void, isEditing?: boolean, initialData?: any, onBookingUpdated?: (data: any) => void }) {
    const [routeFields, setRouteFields] = useState(2);
    const { toast } = useToast();
    const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    const { user: currentUser } = useAuth();
    const [duplicatePnrAlert, setDuplicatePnrAlert] = useState<BookingEntry | null>(null);
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    
    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: isEditing ? initialData : {
            pnr: '',
            supplierId: '',
            clientId: '',
            currency: 'USD',
            issueDate: new Date(),
            travelDate: new Date(),
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
        if (currentUser && 'role' in currentUser && currentUser.boxId && !isEditing) {
            form.setValue('boxId', currentUser.boxId);
        }
    }, [currentUser, isEditing, form]);

    const { control, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, getValues, register } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'passengers',
    });
  
    const boxName = React.useMemo(() => {
        const boxId = watch('boxId');
        return navData?.boxes?.find(b => b.id === boxId)?.name || 'غير محدد';
    }, [watch, navData?.boxes]);
    
    const totalPurchasePrice = watch('passengers').reduce((acc, p) => acc + (Number(p.purchasePrice) || 0), 0);
    const totalSalePrice = watch('passengers').reduce((acc, p) => acc + (Number(p.salePrice) || 0), 0);
    const totalProfit = totalSalePrice - totalPurchasePrice;
    
    const proceedWithSubmit = async (data: BookingFormValues) => {
        const actionToast = toast({ title: "جاري إضافة الحجز..." });
        
        try {
            const route = [data.route1, data.route2, data.route3, data.route4].filter(Boolean).join(' - ');
            const newBookingPayload = {
                ...data,
                route,
                travelDate: data.travelDate.toISOString(),
                issueDate: data.issueDate.toISOString(),
            };
            
            const result = isEditing 
                ? await updateBooking(initialData.id, newBookingPayload as any)
                : await addBooking(newBookingPayload as any);

            if (result.success && (result.newBooking || result.updatedBooking)) {
                actionToast.update({ id: actionToast.id, title: `تم ${isEditing ? 'تحديث' : 'إضافة'} الحجز بنجاح` });
                if(onBookingAdded && result.newBooking) onBookingAdded(result.newBooking);
                if(onBookingUpdated && result.updatedBooking) onBookingUpdated(result.updatedBooking);
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            actionToast.update({ id: actionToast.id, title: "خطأ", description: e.message, variant: "destructive" });
        }
    }

    const onSubmit = async (data: BookingFormValues) => {
        if (!isEditing) {
            const existingBookings = await findBookingByRef(data.pnr);
            if (existingBookings && existingBookings.length > 0) {
                setDuplicatePnrAlert(existingBookings[0]);
                return;
            }
        }
        await proceedWithSubmit(data);
    };

    const addPricingRule = () => {
        setPricingRules(prev => [...prev, {
            id: Date.now(),
            ticketType: 'Adult',
            fareBuy: 0,
            tax1: 0,
            tax2: 0,
            sale: 0,
            charge: 0,
            percentage: 0,
            total: 0
        }]);
    };

    const updatePricingRule = (index: number, field: keyof PricingRule, value: any) => {
        const newRules = [...pricingRules];
        (newRules[index] as any)[field] = value;
        setPricingRules(newRules);
    };
    
     const applyPricingRule = (rule: PricingRule) => {
        const currentPassengers = getValues('passengers');
        const purchasePrice = rule.fareBuy + rule.tax1 + rule.tax2 + rule.charge;
        const salePrice = rule.sale;

        const updatedPassengers = currentPassengers.map(p => {
            if (p.passengerType === rule.ticketType) {
                return { ...p, purchasePrice, salePrice };
            }
            return p;
        });
        setValue('passengers', updatedPassengers, { shouldValidate: true, shouldDirty: true });
        toast({ title: `تم تطبيق تسعيرة ${rule.ticketType}` });
    };

  
    if (!isDataLoaded) {
        return (
            <div className="relative pt-4">
                <div className="pt-6 flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            </div>
        )
    }

    return (
      <Form {...form}>
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-row-reverse bg-background text-sm">
             <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-grow p-2 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                    <Label>تاريخ الاصدار</Label>
                                    <DateTimePicker date={watch('issueDate')} setDate={(d) => setValue('issueDate', d!)} />
                                </div>
                                    <div className="space-y-2">
                                    <Label>تاريخ السفر</Label>
                                    <DateTimePicker date={watch('travelDate')} setDate={(d) => setValue('travelDate', d!)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Section title="المورد">
                                    <div className="space-y-2 text-right">
                                        <div className="grid grid-cols-[80px,1fr] items-center gap-2">
                                            <Label>حساب المورد</Label>
                                                <Controller name="supplierId" control={control} render={({ field }) => ( <Autocomplete searchAction='suppliers' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن مورد..." /> )}/>
                                        </div>
                                        <div className="grid grid-cols-[80px,1fr] items-center gap-2">
                                            <Label>الدفع</Label>
                                            <Select><SelectTrigger className="h-7"><SelectValue placeholder="آجل" /></SelectTrigger><SelectContent>
                                                <SelectItem value="Debit">آجل</SelectItem>
                                                <SelectItem value="Cash">نقدي</SelectItem>
                                            </SelectContent></Select>
                                        </div>
                                            <div className="grid grid-cols-[80px,1fr] items-center gap-2">
                                            <Label>العملة</Label>
                                            <Controller name="currency" control={control} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-7"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="IQD">IQD</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                    </div>
                                </Section>
                                    <Section title="العميل">
                                    <div className="space-y-2 text-right">
                                        <div className="grid grid-cols-[80px,1fr] items-center gap-2">
                                            <Label>العميل</Label>
                                            <Controller name="clientId" control={control} render={({ field }) => ( <Autocomplete searchAction='clients' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل..." /> )}/>
                                        </div>
                                        <div className="grid grid-cols-[80px,1fr] items-center gap-2">
                                            <Label>الدفع</Label>
                                            <Select><SelectTrigger className="h-7"><SelectValue placeholder="نقدي"/></SelectTrigger><SelectContent>
                                                <SelectItem value="Cash">نقدي</SelectItem>
                                                <SelectItem value="Debit">آجل</SelectItem>
                                            </SelectContent></Select>
                                        </div>
                                    </div>
                                </Section>
                            </div>
                           <div className="grid grid-cols-2 gap-4">
                               <Section title="الخصم والناقل">
                                    <div className="space-y-4">
                                        <FormField
                                            control={control}
                                            name="discountValue"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>قيمة الخصم</FormLabel>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Input className="h-8" type="number" placeholder="قيمة الخصم" {...field} />
                                                        </FormControl>
                                                        <Controller
                                                            name="discountType"
                                                            control={control}
                                                            render={({ field: radioField }) => (
                                                                <RadioGroup
                                                                    value={radioField.value}
                                                                    onValueChange={radioField.onChange}
                                                                    className="flex items-center border rounded-md p-1"
                                                                >
                                                                    <FormItem className="flex items-center space-x-2 space-x-reverse"><FormControl><RadioGroupItem value="percentage" id="r-percent" /></FormControl><Label htmlFor="r-percent">نسبة %</Label></FormItem>
                                                                    <FormItem className="flex items-center space-x-2 space-x-reverse"><FormControl><RadioGroupItem value="fixed" id="r-fixed" /></FormControl><Label htmlFor="r-fixed">مبلغ $</Label></FormItem>
                                                                </RadioGroup>
                                                            )}
                                                        />
                                                    </div>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name="carrier"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>الناقل</FormLabel>
                                                    <FormControl>
                                                        <Autocomplete options={airportOptions} placeholder="اختر الناقل..." {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </Section>
                                    <Section title="بيانات الحجز">
                                    <div className="grid grid-cols-2 gap-4 p-2">
                                        <div className="flex items-center gap-2">
                                        <Label>PNR</Label>
                                        <Input className="h-7" placeholder="***" {...register('pnr')} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                        <Label>V.L</Label>
                                        <Input className="h-7" placeholder="***" {...register('vl')} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 p-2">
                                        <RouteIcon className="h-5 w-5 text-muted-foreground"/>
                                        {Array.from({ length: routeFields }).map((_, index) => (
                                            <React.Fragment key={index}>
                                                {index > 0 && <ArrowLeft className="h-5 w-5 text-muted-foreground shrink-0"/>}
                                                <Controller name={`route${index + 1}` as 'route1' | 'route2' | 'route3' | 'route4'} control={control} render={({ field }) => (<Autocomplete options={airportOptions} {...field} placeholder="..."/>)} />
                                            </React.Fragment>
                                        ))}
                                        {routeFields < 4 && (
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRouteFields(p => p + 1)}>
                                                <PlusCircle className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                    </Section>
                            </div>
                        </div>
                        <div className="col-span-6 space-y-4">
                            <Section title="الأسماء">
                                <div className="p-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-primary/10 hover:bg-primary/20">
                                                 <TableHead className="p-1 text-xs font-semibold text-right">المسافر</TableHead>
                                                <TableHead className="p-1 text-xs font-semibold text-right">التذكرة</TableHead>
                                                <TableHead className="p-1 text-xs font-semibold text-right">النوع</TableHead>
                                                <TableHead className="p-1 text-xs font-semibold text-right">شراء</TableHead>
                                                <TableHead className="p-1 text-xs font-semibold text-right">بيع</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell className="p-0"><Input className="border-0 rounded-none h-7" placeholder="اسم المسافر" {...register(`passengers.${index}.name`)}/></TableCell>
                                                    <TableCell className="p-0"><Input className="border-0 rounded-none h-7" placeholder="رقم التذكرة" {...register(`passengers.${index}.ticketNumber`)}/></TableCell>
                                                        <TableCell className="p-0">
                                                            <Controller
                                                                control={control}
                                                                name={`passengers.${index}.passengerType`}
                                                                render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="border-0 rounded-none h-7"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            {passengerTypeOptions.map(option => {
                                                                                const Icon = option.icon;
                                                                                return <SelectItem key={option.value} value={option.value}><div className="flex items-center justify-end gap-2"><span>{option.label}</span><Icon className="h-4 w-4"/></div></SelectItem>
                                                                            })}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </TableCell>
                                                    <TableCell className="p-0"><NumericInput className="border-0 rounded-none h-7" placeholder="شراء" {...register(`passengers.${index}.purchasePrice`)}/></TableCell>
                                                    <TableCell className="p-0"><NumericInput className="border-0 rounded-none h-7" placeholder="بيع" {...register(`passengers.${index}.salePrice`)}/></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Section>
                            <Section title="الملاحظات">
                                <Controller name="notes" control={control} render={({ field }) => (<Textarea {...field} />)}/>
                            </Section>
                        </div>
                    </div>
                     <Section title="تسعير أنواع التذاكر">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>النوع</TableHead>
                                        <TableHead>Fare</TableHead>
                                        <TableHead>%</TableHead>
                                        <TableHead>Tax1</TableHead>
                                        <TableHead>Tax2</TableHead>
                                        <TableHead>Sale</TableHead>
                                        <TableHead>Charge</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>ADD TK</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pricingRules.map((rule, index) => (
                                        <TableRow key={rule.id}>
                                            <TableCell className="p-1">
                                                <Select value={rule.ticketType} onValueChange={v => updatePricingRule(index, 'ticketType', v)}>
                                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Adult">Adult</SelectItem>
                                                        <SelectItem value="Child">Child</SelectItem>
                                                        <SelectItem value="Infant">Infant</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.fareBuy} onValueChange={v => updatePricingRule(index, 'fareBuy', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.percentage} onValueChange={v => updatePricingRule(index, 'percentage', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.tax1} onValueChange={v => updatePricingRule(index, 'tax1', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.tax2} onValueChange={v => updatePricingRule(index, 'tax2', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.sale} onValueChange={v => updatePricingRule(index, 'sale', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.charge} onValueChange={v => updatePricingRule(index, 'charge', v)} /></TableCell>
                                            <TableCell className="p-1"><NumericInput className="h-8" value={rule.total} onValueChange={v => updatePricingRule(index, 'total', v)} /></TableCell>
                                            <TableCell className="p-1"><Button size="sm" onClick={() => applyPricingRule(rule)}>ADD</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <div className="flex justify-between items-center mt-2">
                             <div className="p-4 border rounded-lg bg-background shadow-sm">
                                <h4 className="font-bold text-lg">ملخص التسعير</h4>
                                <div className="flex gap-4 font-bold text-center mt-2">
                                    <div className="p-2 rounded-md">إجمالي الشراء: <span className="text-red-600">{totalPurchasePrice.toFixed(2)}</span></div>
                                    <div className="p-2 rounded-md">إجمالي البيع: <span className="text-green-600">{totalSalePrice.toFixed(2)}</span></div>
                                    <div className="p-2 rounded-md">الربح: <span className="text-blue-600">{totalProfit.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addPricingRule}>إضافة نوع تسعير</Button>
                        </div>
                    </Section>
                </div>
                 <footer className="p-2 border-t flex items-center justify-between bg-gray-100 dark:bg-gray-800 text-xs mt-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>الصندوق</Label>
                            <Select><SelectTrigger className="h-7 w-32"><SelectValue placeholder="اختر صندوق..." /></SelectTrigger><SelectContent>{navData?.boxes?.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label>موظف الاصدار</Label>
                            <Select><SelectTrigger className="h-7 w-32"><SelectValue placeholder="اختر موظف..." /></SelectTrigger><SelectContent>{navData?.users?.map(opt => <SelectItem key={opt.uid} value={opt.uid}>{opt.name}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                     <div className="flex-grow"></div>
                     <div className="flex items-center gap-2">
                         <p>المستخدم الحالي ({currentUser?.name})</p>
                         <p>الرقم العام: <span className="font-bold">(تلقائي)</span></p>
                    </div>
                </footer>
            </main>
            <aside dir="ltr" className="w-16 bg-muted/50 border-r flex flex-col items-center py-3 gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10" onClick={() => append({ name: "", ticketNumber: "", passengerType: "Adult", purchasePrice: 0, salePrice: 0, clientStatement: '' } as any)}>
                    <PlusCircle className="h-5 w-5" />
                </Button>
                <Button type="submit" variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10"><Edit className="h-5 w-5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => fields.length > 1 && remove(fields.length - 1)}><Trash2 className="h-5 w-5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10"><Printer className="h-5 w-5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10"><Search className="h-5 w-5" /></Button>
            </aside>
        </form>
    </Form>
    );
}
