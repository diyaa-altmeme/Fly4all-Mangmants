
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, Pencil } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { updateSegmentEntry, deleteSegmentPeriod, addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';


const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  partnerId: z.string().min(1, { message: "اسم الشريك مطلوب." }),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;


interface EditSegmentPeriodDialogProps {
  existingPeriod: {
    fromDate: string;
    toDate: string;
    entries: SegmentEntry[];
  };
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

const EditCompanyForm = ({ entryData, allCompanyOptions, partnerOptions, onSave, onCancel }: { 
    entryData: any, 
    allCompanyOptions: {value: string, label: string}[],
    partnerOptions: {value: string, label: string}[],
    onSave: (data: any) => void, 
    onCancel: () => void 
}) => {
    
    const form = useForm<CompanyEntryFormValues>({
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: entryData.clientId || '',
            partnerId: partnerOptions.find(p => p.value.endsWith(entryData.partnerId))?.value || '',
            tickets: entryData.tickets || 0,
            visas: entryData.visas || 0,
            hotels: entryData.hotels || 0,
            groups: entryData.groups || 0,
        },
    });

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="p-4 bg-muted/50 rounded-lg space-y-4">
                 <h4 className="font-semibold text-base mb-2">تعديل بيانات: {entryData.companyName}</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="clientId" render={({ field }) => (
                        <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="partnerId" render={({ field }) => (
                        <FormItem><FormLabel>الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شريك..."/></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="tickets" render={({ field }) => (<FormItem><FormLabel>التذاكر</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="visas" render={({ field }) => (<FormItem><FormLabel>الفيزا</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="hotels" render={({ field }) => (<FormItem><FormLabel>الفنادق</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="groups" render={({ field }) => (<FormItem><FormLabel>الكروبات</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
                 <div className='flex justify-end items-center gap-2'>
                    <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
                    <Button type="submit"><Pencil className='me-2 h-4 w-4'/> تحديث البيانات</Button>
                 </div>
            </form>
        </Form>
    );
}

export default function EditSegmentPeriodDialog({ existingPeriod, clients, suppliers, onSuccess }: EditSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<(Omit<SegmentEntry, 'fromDate' | 'toDate'>)[]>([]);
    const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

     const allCompanyOptions = useMemo(() => {
        return clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name }));
    }, [clients]);

     const partnerOptions = useMemo(() => {
        const clientPartners = clients.filter(c => c.type === 'company').map(c => ({ value: `client-${c.id}`, label: `شركة: ${c.name}` }));
        const supplierPartners = suppliers.map(s => ({ value: `supplier-${s.id}`, label: `مورد: ${s.name}` }));
        return [...clientPartners, ...supplierPartners];
    }, [clients, suppliers]);
    
    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    const periodForm = useForm<PeriodFormValues>({
      resolver: zodResolver(periodSchema),
      defaultValues: { fromDate: parseISO(existingPeriod.fromDate), toDate: parseISO(existingPeriod.toDate) },
    });

    const companyForm = useForm<CompanyEntryFormValues>({ resolver: zodResolver(companyEntrySchema) });

    useEffect(() => {
        if (open) {
            periodForm.reset({ fromDate: parseISO(existingPeriod.fromDate), toDate: parseISO(existingPeriod.toDate) });
            setPeriodEntries(existingPeriod.entries.map(({ fromDate, toDate, ...rest }) => rest));
        } else {
            companyForm.reset({});
            setPeriodEntries([]);
            setOpenRowIndex(null);
        }
    }, [open, existingPeriod, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues) => {
        const client = clients.find(c => c.id === data.clientId);
        const settings = client?.segmentSettings || {
            ticketProfitPercentage: 50, visaProfitPercentage: 100, hotelProfitPercentage: 100,
            groupProfitPercentage: 100, alrawdatainSharePercentage: 50,
        };

        const ticketProfits = data.tickets * (settings.ticketProfitPercentage / 100);
        const visaProfits = data.visas * (settings.visaProfitPercentage / 100);
        const hotelProfits = data.hotels * (settings.hotelProfitPercentage / 100);
        const groupProfits = data.groups * (settings.groupProfitPercentage / 100);
        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        const alrawdatainShare = total * (settings.alrawdatainSharePercentage / 100);
        const mateenShare = total * ((100 - settings.alrawdatainSharePercentage) / 100);
        
        const selectedPartnerOption = partnerOptions.find(p => p.value === data.partnerId);

        return { 
            ...data, 
            ticketProfits, 
            otherProfits, 
            total, 
            alrawdatainShare, 
            mateenShare, 
            companyName: client?.name || '',
            partnerId: selectedPartnerOption?.value.split('-')[1] || '',
            partnerName: selectedPartnerOption?.label || '',
        };
    }

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const newEntry = calculateShares(data);
        setPeriodEntries(prev => [...prev, {id: `new-${Date.now()}`, ...newEntry}]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0 });
    };

    const handleUpdateCompanyEntry = (index: number, data: CompanyEntryFormValues) => {
        const updatedEntry = calculateShares(data);
        const updatedEntries = [...periodEntries];
        updatedEntries[index] = {...updatedEntries[index], ...updatedEntry};
        setPeriodEntries(updatedEntries);
        toast({ title: "تم تحديث الشركة", description: `تم تحديث بيانات ${updatedEntry.companyName}.` });
        setOpenRowIndex(null);
    }
    
    const removeEntry = (index: number) => {
        setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    }

    const handleSavePeriod = async () => {
        const periodData = await periodForm.trigger() ? periodForm.getValues() : null;
        if (!periodData) {
            toast({ title: "الرجاء تحديد فترة محاسبية صحيحة", variant: "destructive" });
            return;
        }

        if (periodEntries.length === 0) {
            await deleteSegmentPeriod(existingPeriod.fromDate, existingPeriod.toDate);
            toast({ title: "تم حذف الفترة", description: "تم حذف الفترة المحاسبية لعدم وجود سجلات." });
            setOpen(false);
            await onSuccess();
            return;
        }

        setIsSaving(true);
        try {
            // This is a complex update. The simplest robust way is to delete the old period and add the new one.
            await deleteSegmentPeriod(existingPeriod.fromDate, existingPeriod.toDate);
            
            const finalEntries = periodEntries.map((entry) => {
                const { id, ...rest } = entry; // remove temporary/old ID
                return {
                    ...rest,
                    fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'),
                    toDate: format(periodData.toDate!, 'yyyy-MM-dd'),
                }
            });

            await addSegmentEntries(finalEntries as any);

            toast({ title: "تم حفظ بيانات الفترة بنجاح" });
            setOpen(false);
            await onSuccess();
            
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message || "لم يتم حفظ البيانات.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="me-2 h-4 w-4" />
                    تعديل الفترة
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>تعديل سجل سكمنت</DialogTitle>
                    <DialogDescription>عدّل بيانات الفترة، ثم أضف أو عدّل الشركات، ثم احفظ الفترة كاملة.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-auto pr-6 -mr-6 space-y-4">
                     <div className="p-4 border rounded-lg bg-background/50 sticky top-0 z-10">
                        <h3 className="font-semibold text-base mb-2">الخطوة 1: تعديل الفترة المحاسبية</h3>
                        <Form {...periodForm}>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <FormField control={periodForm.control} name="fromDate" render={({ field }) => (
                                    <FormItem><FormLabel>من تاريخ</FormLabel><Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsFromCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                <FormField control={periodForm.control} name="toDate" render={({ field }) => (
                                    <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsToCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                            </form>
                        </Form>
                    </div>
                    
                    <div className='p-4 border rounded-lg'>
                        <h3 className="font-semibold text-base mb-2">الخطوة 2: الشركات المضافة لهذه الفترة ({periodEntries.length})</h3>
                        <div className='border rounded-lg overflow-hidden'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الشركة</TableHead>
                                        <TableHead>إجمالي الربح</TableHead>
                                        <TableHead>حصة الروضتين</TableHead>
                                        <TableHead>حصة الشريك</TableHead>
                                        <TableHead className='w-[100px] text-center'>الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {periodEntries.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">لا توجد سجلات. سيتم حذف الفترة عند الحفظ.</TableCell></TableRow>
                                ) : periodEntries.map((entry, index) => (
                                    <Collapsible asChild key={entry.id} open={openRowIndex === index} onOpenChange={() => setOpenRowIndex(prev => prev === index ? null : index)}>
                                        <>
                                            <TableRow className="cursor-pointer" onClick={() => setOpenRowIndex(prev => prev === index ? null : index)}>
                                                <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                                <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{entry.mateenShare.toFixed(2)}</TableCell>
                                                <TableCell className='text-center space-x-1'>
                                                    <Button variant="ghost" size="icon" className='h-8 w-8 text-blue-600'><Pencil className='h-4 w-4'/></Button>
                                                    <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={(e) => {e.stopPropagation(); removeEntry(index)}}><Trash2 className='h-4 w-4'/></Button>
                                                </TableCell>
                                            </TableRow>
                                             <CollapsibleContent asChild>
                                                <TableRow>
                                                    <TableCell colSpan={5} className="p-0">
                                                        <EditCompanyForm
                                                            entryData={entry}
                                                            allCompanyOptions={allCompanyOptions}
                                                            partnerOptions={partnerOptions}
                                                            onSave={(data) => handleUpdateCompanyEntry(index, data)}
                                                            onCancel={() => setOpenRowIndex(null)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            </CollapsibleContent>
                                        </>
                                        </Collapsible>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-base mb-2">الخطوة 3: إضافة شركة جديدة</h3>
                        <Form {...companyForm}>
                            <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={companyForm.control} name="clientId" render={({ field }) => (
                                        <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={companyForm.control} name="partnerId" render={({ field }) => (
                                        <FormItem><FormLabel>الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شريك..."/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={companyForm.control} name="tickets" render={({ field }) => (<FormItem><FormLabel>التذاكر</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={companyForm.control} name="visas" render={({ field }) => (<FormItem><FormLabel>الفيزا</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={companyForm.control} name="hotels" render={({ field }) => (<FormItem><FormLabel>الفنادق</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={companyForm.control} name="groups" render={({ field }) => (<FormItem><FormLabel>الكروبات</FormLabel><FormControl><Input type="text" inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className='flex justify-end'>
                                    <Button type="submit"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            
                <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
                    <Button type="button" onClick={handleSavePeriod} disabled={isSaving} className="w-full sm:w-auto">
                        {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                        حفظ التعديلات ({periodEntries.length} سجلات)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
