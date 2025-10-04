
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Play, Search, User, Save, Trash2, Plus, Printer, RefreshCw, X, Settings2, RotateCcw, ChevronsUpDown, Loader2, UserCheck, Users, Info, HandCoins, Minus, PlusCircle, AlertTriangle, ArrowLeft, ArrowRight, TicketCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { findBookingByRef, refundBooking, exchangeBooking, voidBooking } from "../actions";
import type { BookingEntry, OperationType, TicketQuoteBreakdown, Passenger, User as CurrentUser, TicketType, Currency } from "@/lib/types";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { Autocomplete } from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";


// ========= Step 2: Passenger Selection Table =========
const PassengerSelectionTable = ({
    passengers,
    selectedPassengers,
    onPassengerSelect,
    currency
}: {
    passengers: Passenger[],
    selectedPassengers: Set<string>,
    onPassengerSelect: (ticketNumber: string, isSelected: boolean) => void,
    currency: Currency
}) => {
    
    const allSelected = passengers.length > 0 && selectedPassengers.size === passengers.length;
    const isIndeterminate = selectedPassengers.size > 0 && selectedPassengers.size < passengers.length;
    
    const handleSelectAll = (checked: boolean) => {
        passengers.forEach(p => onPassengerSelect(p.ticketNumber, checked));
    };

    return (
        <Card className="col-span-full">
            <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base">الخطوة 2: تحديد المسافرين</CardTitle>
                <CardDescription>اختر المسافرين الذين تريد تطبيق العملية عليهم.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-auto max-h-60 rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={allSelected || isIndeterminate}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>الاسم</TableHead>
                                <TableHead>رقم التذكرة</TableHead>
                                <TableHead className="text-right">سعر الشراء الأصلي</TableHead>
                                <TableHead className="text-right">سعر البيع الأصلي</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {passengers.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedPassengers.has(p.ticketNumber)}
                                            onCheckedChange={(checked) => onPassengerSelect(p.ticketNumber, !!checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-semibold">{p.name}</TableCell>
                                    <TableCell className="font-mono">{p.ticketNumber}</TableCell>
                                    <TableCell className="text-right font-mono">{p.purchasePrice.toLocaleString()} {currency}</TableCell>
                                    <TableCell className="text-right font-mono">{p.salePrice.toLocaleString()} {currency}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// ========= Step 3 & 4: New Operation Form =========
const newOperationSchema = z.object({
  opType: z.enum(["REFUND", "REISSUE", "VOID"]),
  pnr: z.string().optional(),
  ticketNumber: z.string().min(1, "رقم التذكرة مطلوب"),
  passengerName: z.string().min(1, "اسم المسافر مطلوب"),
  supplierId: z.string().min(1, "المورد مطلوب"),
  clientId: z.string().min(1, "العميل مطلوب"),
  currency: z.enum(['USD', 'IQD']),
  notes: z.string().optional(),
  airlineFee: z.coerce.number().default(0),
  officeFee: z.coerce.number().default(0),
  newPnr: z.string().optional(),
  priceDifference: z.coerce.number().default(0),
  supplierVoidPenalty: z.coerce.number().default(0),
  clientVoidPenalty: z.coerce.number().default(0),
});
type NewOperationValues = z.infer<typeof newOperationSchema>;

const NewOperationForm = ({onSave, isSaving}: {onSave: (values: NewOperationValues) => void, isSaving: boolean}) => {
    const { data: navData } = useVoucherNav();
    const form = useForm<NewOperationValues>({
        resolver: zodResolver(newOperationSchema),
        defaultValues: {
            opType: "REFUND",
            currency: 'USD'
        }
    });

    const opType = form.watch("opType");
    const currency = form.watch("currency");

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="opType" render={({ field }) => ( <FormItem><Label>نوع العملية</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="REFUND">استرجاع</SelectItem><SelectItem value="REISSUE">تغيير / إعادة إصدار</SelectItem><SelectItem value="VOID">فويد / إلغاء</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="pnr" render={({ field }) => ( <FormItem><Label>رقم الحجز (PNR)</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="ticketNumber" render={({ field }) => ( <FormItem><Label>رقم التذكرة</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="passengerName" render={({ field }) => ( <FormItem><Label>اسم المسافر</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="supplierId" render={({ field }) => ( <FormItem><Label>المورد</Label><FormControl><Autocomplete searchAction="suppliers" value={field.value} onValueChange={field.onChange} placeholder="اختر مورد..." /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="clientId" render={({ field }) => ( <FormItem><Label>العميل</Label><FormControl><Autocomplete searchAction="clients" value={field.value} onValueChange={field.onChange} placeholder="اختر عميل..." /></FormControl><FormMessage /></FormItem> )} />
                     <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><Label>العملة</Label><Select onValueChange={field.onChange as (value: string) => void} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
                 {opType !== 'VOID' && (
                     <div className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h3 className="md:col-span-2 font-semibold">التفاصيل المالية</h3>
                         <FormField control={form.control} name="airlineFee" render={({ field }) => ( <FormItem><Label>غرامة شركة الطيران</Label><FormControl><NumericInput currency={currency} {...field} onValueChange={(v) => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="officeFee" render={({ field }) => ( <FormItem><Label>رسوم المكتب</Label><FormControl><NumericInput currency={currency} {...field} onValueChange={(v) => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem> )} />
                        {opType === 'REISSUE' && (
                             <>
                                <FormField control={form.control} name="priceDifference" render={({ field }) => ( <FormItem><Label>فرق السعر (ADC)</Label><FormControl><NumericInput currency={currency} {...field} onValueChange={(v) => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="newPnr" render={({ field }) => ( <FormItem><Label>PNR الجديد</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                             </>
                        )}
                    </div>
                )}
                 {opType === 'VOID' && (
                     <div className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                        <h3 className="md:col-span-2 font-semibold">غرامات الفويد</h3>
                         <FormField control={form.control} name="supplierVoidPenalty" render={({ field }) => ( <FormItem><Label>غرامة فويد (للمورد)</Label><FormControl><NumericInput currency={currency} {...field} onValueChange={(v) => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="clientVoidPenalty" render={({ field }) => ( <FormItem><Label>غرامة فويد (للعميل)</Label><FormControl><NumericInput currency={currency} {...field} onValueChange={(v) => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                )}
                 <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? <Loader2 className="animate-spin me-2" /> : <Save className="me-2 h-4 w-4" />}
                    حفظ العملية
                </Button>
            </form>
        </Form>
    );
}


// ========= Main Dialog Component =========
export default function TicketOperationsDialog({ onDataChanged }: { onDataChanged: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [foundBookings, setFoundBookings] = useState<BookingEntry[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingEntry | null>(null);
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(new Set());

  const [opType, setOpType] = useState<OperationType>("REFUND");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPnr, setNewPnr] = useState("");
  
  const [quote, setQuote] = useState<TicketQuoteBreakdown>({
    base: 0, tax: 0, penalty: 0, fees: 0, adc: 0, residualEmd: 0
  });
  
    const [voidPenalties, setVoidPenalties] = useState({ supplierPenalty: 0, clientPenalty: 0 });
  
  const [initialStep, setInitialStep] = useState<null | 'existing' | 'new'>(null);

  const { data: navData } = useVoucherNav();
  
  const performSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setFoundBookings([]);
    setSelectedBooking(null);
    setSelectedPassengers(new Set());
    const res = await findBookingByRef(query.trim());
    if (res && res.length > 0) {
      setFoundBookings(res);
      if (res.length === 1) {
        setSelectedBooking(res[0]);
      }
    } else {
      toast({ title: "لم يتم العثور على أي حجز مطابق", variant: "destructive" });
    }
    setLoading(false);
  };
  
  const handlePassengerSelect = (ticketNumber: string, isSelected: boolean) => {
      setSelectedPassengers(prev => {
          const newSet = new Set(prev);
          if (isSelected) {
              newSet.add(ticketNumber);
          } else {
              newSet.delete(ticketNumber);
          }
          return newSet;
      });
  };

  const saveExistingOperation = async () => {
    if (!selectedBooking) {
        toast({ title: "الرجاء اختيار حجز أولاً", variant: "destructive" });
        return;
    }
    const currency = selectedBooking.currency || 'USD';
    const passengersToProcess = selectedBooking.passengers.filter(p => selectedPassengers.has(p.ticketNumber));

    setIsSaving(true);
    try {
        let result;
        if (opType === 'VOID') {
             if (selectedPassengers.size === 0) {
                throw new Error("الرجاء اختيار مسافر واحد على الأقل.");
            }
            result = await voidBooking(selectedBooking, { passengers: passengersToProcess, ...voidPenalties, notes, currency }, false);
        } else {
            if (selectedPassengers.size === 0) {
                 throw new Error("الرجاء اختيار مسافر واحد على الأقل.");
            }
            if(opType === 'REFUND') {
                result = await refundBooking(selectedBooking, { passengers: passengersToProcess, airlineFee: quote.penalty, officeFee: quote.fees, notes, currency }, false);
            } else if (opType === 'REISSUE') {
                result = await exchangeBooking(selectedBooking, { passengers: passengersToProcess, newPnr, airlineFee: quote.penalty, officeFee: quote.fees, priceDifference: quote.adc, notes, currency }, false);
            } else {
                 throw new Error("نوع عملية غير معروف.");
            }
        }
        
        if (result.success) {
            toast({ title: `تم تسجيل عملية ${opType} بنجاح` });
            setOpen(false);
            onDataChanged();
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const saveNewOperation = async (values: NewOperationValues) => {
    setIsSaving(true);
    try {
        const dummyBooking: BookingEntry = {
            id: `new-${Date.now()}`,
            pnr: values.pnr || '',
            clientId: values.clientId,
            supplierId: values.supplierId,
            passengers: [{
                id: 'new-passenger',
                name: values.passengerName,
                ticketNumber: values.ticketNumber,
                purchasePrice: 0,
                salePrice: 0,
                passengerType: 'Adult',
                ticketType: 'Issue',
                passportNumber: '',
            }]
        } as BookingEntry;
        
        const passengersToProcess = dummyBooking.passengers;
        let result;
        if (values.opType === 'VOID') {
             result = await voidBooking(dummyBooking, { passengers: passengersToProcess, supplierPenalty: values.supplierVoidPenalty, clientPenalty: values.clientVoidPenalty, notes: values.notes || '', currency: values.currency }, true);
        } else if(values.opType === 'REFUND') {
            result = await refundBooking(dummyBooking, { passengers: passengersToProcess, airlineFee: values.airlineFee, officeFee: values.officeFee, notes: values.notes || '', currency: values.currency }, true);
        } else if (values.opType === 'REISSUE') {
            result = await exchangeBooking(dummyBooking, { passengers: passengersToProcess, newPnr: values.newPnr || '', airlineFee: values.airlineFee, officeFee: values.officeFee, priceDifference: values.priceDifference, notes: values.notes || '', currency: values.currency }, true);
        } else {
            throw new Error("نوع عملية غير معروف.");
        }

        if (result.success) {
            toast({ title: `تم تسجيل عملية ${values.opType} الخارجية بنجاح` });
            setOpen(false);
            onDataChanged();
        } else {
            throw new Error(result.error);
        }
    } catch(e: any) {
        toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  }
  
   useEffect(() => {
    if (!open) {
      setQuery("");
      setFoundBookings([]);
      setSelectedBooking(null);
      setSelectedPassengers(new Set());
      setOpType("REFUND");
      setNotes("");
      setNewPnr("");
      setVoidPenalties({ supplierPenalty: 0, clientPenalty: 0 });
      setInitialStep(null);
    }
  }, [open]);

  const currency = selectedBooking?.currency || 'USD';
  
  const summaryCalculations = useMemo(() => {
    if (!selectedBooking || selectedPassengers.size === 0) {
      return { totalSale: 0, totalPurchase: 0, totalFees: 0, amountToClient: 0, amountFromSupplier: 0, netClientDebt: 0, netSupplierCredit: 0 };
    }
    const passengersToProcess = selectedBooking.passengers.filter(p => selectedPassengers.has(p.ticketNumber));
    const totalSale = passengersToProcess.reduce((sum, p) => sum + p.salePrice, 0);
    const totalPurchase = passengersToProcess.reduce((sum, p) => sum + p.purchasePrice, 0);
    
    if (opType === 'VOID') {
        const netClientDebt = voidPenalties.clientPenalty - totalSale;
        const netSupplierCredit = totalPurchase - voidPenalties.supplierPenalty;
        return { totalSale, totalPurchase, totalFees: 0, amountToClient: 0, amountFromSupplier: 0, netClientDebt, netSupplierCredit };
    }

    const totalFees = quote.penalty + quote.fees;
    const amountToClient = opType === 'REFUND' ? totalSale - totalFees : totalFees + quote.adc;
    const amountFromSupplier = opType === 'REFUND' ? totalPurchase - quote.penalty : 0;
    return { totalSale, totalPurchase, totalFees, amountToClient, amountFromSupplier, netClientDebt: 0, netSupplierCredit: 0 };
  }, [selectedBooking, selectedPassengers, quote, opType, voidPenalties]);

  const renderContent = () => {
    if (!initialStep) {
        return (
             <div className="text-center p-8 space-y-4">
                <h3 className="text-lg font-semibold">هل العملية لتذكرة موجودة مسبقًا في النظام أم عملية خارجية؟</h3>
                <div className="flex justify-center gap-4">
                     <Button size="lg" onClick={() => setInitialStep('existing')} className="gap-2"><TicketCheck className="h-5 w-5"/>تذكرة موجودة</Button>
                     <Button size="lg" onClick={() => setInitialStep('new')} variant="secondary" className="gap-2"><PlusCircle className="h-5 w-5"/>عملية خارجية جديدة</Button>
                </div>
            </div>
        )
    }
    
    if (initialStep === 'new') {
        return <NewOperationForm onSave={saveNewOperation} isSaving={isSaving}/>
    }

    // Existing ticket flow
    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-3">
                    <Label>رقم التذكرة أو PNR</Label>
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} />
                </div>
                <Button onClick={performSearch} className="w-full" variant="secondary" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4 ml-1"/>}بحث</Button>
            </div>
            
            {/* Search Results / Disambiguation */}
            {foundBookings.length > 1 && !selectedBooking && (
                 <Card>
                    <CardHeader><CardTitle className="text-base">تم العثور على حجوزات متعددة</CardTitle><CardDescription>الرجاء اختيار الحجز الصحيح للمتابعة.</CardDescription></CardHeader>
                    <CardContent className="space-y-2">
                        {foundBookings.map(b => (
                            <div key={b.id} className="p-2 border rounded-md cursor-pointer hover:bg-muted" onClick={() => setSelectedBooking(b)}>
                                <p className="font-bold">PNR: {b.pnr} - Invoice: {b.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground">Client: {navData?.clients.find(c=>c.id === b.clientId)?.name} | Supplier: {navData?.suppliers.find(s=>s.id === b.supplierId)?.name}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Main Content */}
            {selectedBooking && (
               <div className="space-y-4">
                    <PassengerSelectionTable 
                        passengers={selectedBooking.passengers}
                        selectedPassengers={selectedPassengers}
                        onPassengerSelect={handlePassengerSelect}
                        currency={currency}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        <Card>
                            <CardHeader className="pb-3 pt-4">
                                <CardTitle className="text-base">الخطوة 3: تفاصيل العملية</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>نوع العملية</Label>
                                        <Select value={opType} onValueChange={(v: OperationType) => setOpType(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="REFUND">استرجاع</SelectItem>
                                                <SelectItem value="REISSUE">تغيير / إعادة إصدار</SelectItem>
                                                <SelectItem value="VOID">فويد / إلغاء</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>العملة</Label>
                                        <Input value={currency} readOnly disabled />
                                    </div>
                                </div>
                                {opType === 'VOID' ? (
                                    <>
                                        <div className="space-y-1.5"><Label>غرامة فويد (للمورد)</Label><NumericInput currency={currency} value={voidPenalties.supplierPenalty} onValueChange={(v) => setVoidPenalties(p => ({...p, supplierPenalty: v || 0}))} /></div>
                                        <div className="space-y-1.5"><Label>غرامة فويد (للعميل)</Label><NumericInput currency={currency} value={voidPenalties.clientPenalty} onValueChange={(v) => setVoidPenalties(p => ({...p, clientPenalty: v || 0}))} /></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5"><Label>غرامة شركة الطيران</Label><NumericInput currency={currency} value={quote.penalty} onValueChange={(v) => setQuote({ ...quote, penalty: v || 0 })} /></div>
                                        <div className="space-y-1.5"><Label>رسوم المكتب</Label><NumericInput currency={currency} value={quote.fees} onValueChange={(v) => setQuote({ ...quote, fees: v || 0 })} /></div>
                                    </>
                                )}
                                {opType === 'REISSUE' && (
                                    <>
                                        <div className="space-y-1.5"><Label>فرق السعر (ADC)</Label><NumericInput currency={currency} value={quote.adc} onValueChange={(v) => setQuote({ ...quote, adc: v || 0 })} /></div>
                                        <div className="space-y-1.5"><Label>PNR الجديد</Label><Input value={newPnr} onChange={(e) => setNewPnr(e.target.value)} /></div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3 pt-4"><CardTitle className="text-base">ملخص العملية</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">الحجز المحدد:</span><Badge variant="secondary">{selectedBooking.pnr}</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">المسافرون المختارون:</span><Badge>{selectedPassengers.size}</Badge></div>
                                <Separator />
                                {opType === 'VOID' ? (
                                     <>
                                        <div className="flex justify-between items-center font-semibold"><span className="text-muted-foreground">إجمالي مبيع التذكرة:</span><span className="font-mono">{summaryCalculations.totalSale.toLocaleString()} {currency}</span></div>
                                        <div className="flex justify-between items-center font-semibold text-red-600"><span >غرامة العميل:</span><span className="font-mono">{voidPenalties.clientPenalty.toLocaleString()} {currency}</span></div>
                                        <Separator />
                                        <div className="flex justify-between items-center font-bold text-lg text-blue-600"><span>صافي الدين على العميل:</span><span className="font-mono">{summaryCalculations.netClientDebt.toLocaleString()} {currency}</span></div>
                                        <Separator />
                                        <div className="flex justify-between items-center font-semibold"><span className="text-muted-foreground">إجمالي شراء التذكرة:</span><span className="font-mono">{summaryCalculations.totalPurchase.toLocaleString()} {currency}</span></div>
                                        <div className="flex justify-between items-center font-semibold text-red-600"><span >غرامة المورد:</span><span className="font-mono">{voidPenalties.supplierPenalty.toLocaleString()} {currency}</span></div>
                                        <Separator />
                                        <div className="flex justify-between items-center font-bold text-lg text-green-600"><span>المستحق من المورد:</span><span className="font-mono">{summaryCalculations.netSupplierCredit.toLocaleString()} {currency}</span></div>
                                    </>
                                ) : (
                                <>
                                <div className="flex justify-between items-center font-semibold"><span className="text-muted-foreground">إجمالي مبيع التذاكر المختارة:</span><span className="font-mono">{summaryCalculations.totalSale.toLocaleString()} {currency}</span></div>
                                <div className="flex justify-between items-center font-semibold"><span className="text-muted-foreground">إجمالي رسوم الإلغاء/التغيير:</span><span className="font-mono">{summaryCalculations.totalFees.toLocaleString()} {currency}</span></div>
                                {opType === 'REISSUE' && <div className="flex justify-between items-center font-semibold"><span className="text-muted-foreground">فرق السعر (ADC):</span><span className="font-mono">{quote.adc.toLocaleString()} {currency}</span></div>}
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-lg text-blue-600"><span >المبلغ المستحق للعميل:</span><span className="font-mono">{summaryCalculations.amountToClient.toLocaleString()} {currency}</span></div>
                                {opType === 'REFUND' && <div className="flex justify-between items-center font-bold text-lg text-green-600"><span>المبلغ المستحق من المورد:</span><span className="font-mono">{summaryCalculations.amountFromSupplier.toLocaleString()} {currency}</span></div>}
                                </>
                                )}
                            </CardContent>
                             <CardFooter>
                                <Button onClick={saveExistingOperation} disabled={isSaving || (selectedPassengers.size === 0)} className="w-full h-12 text-md">{isSaving ? <Loader2 className="animate-spin" /> : <Save className="ml-2"/>}حفظ العملية</Button>
                             </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><RefreshCw className="me-2 h-4 w-4"/>عمليات التذاكر</Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-[1200px] p-0" 
        dir="rtl"
      >
        <DialogHeader className="px-4 py-3 bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between sticky top-0 z-10 border-b">
           <DialogClose asChild><Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 h-7 w-7 rounded-full"><X className="h-4 w-4"/></Button></DialogClose>
            <DialogTitle className="text-xl font-semibold">
                {initialStep ? 'عمليات التذكرة - Ticket Operations' : 'اختر نوع العملية'}
            </DialogTitle>
          <div>
            {initialStep && (
                <Button variant="ghost" size="sm" onClick={() => setInitialStep(null)}>
                    <ArrowRight className="me-2 h-4 w-4"/>
                    العودة
                </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
           {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
