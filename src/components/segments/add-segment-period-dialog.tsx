
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft } from 'lucide-react';
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
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '../ui/autocomplete';


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

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<Omit<SegmentEntry, 'id' | 'fromDate' | 'toDate'>[]>([]);
    
    const allCompanyOptions = useMemo(() => {
        return clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name }));
    }, [clients]);

     const partnerOptions = useMemo(() => {
        const clientPartners = clients.filter(c => c.type === 'company').map(c => ({ value: `client-${c.id}`, label: `شركة: ${c.name}` }));
        const supplierPartners = suppliers.map(s => ({ value: `supplier-${s.id}`, label: `مورد: ${s.name}` }));
        return [...clientPartners, ...supplierPartners];
    }, [clients, suppliers]);


    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '',
            partnerId: '',
            tickets: 0,
            visas: 0,
            hotels: 0,
            groups: 0,
        }
    });

    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    useEffect(() => {
        if (open) {
            // Reset everything when dialog opens
             periodForm.reset({});
             companyForm.reset({
                clientId: '',
                partnerId: '',
                tickets: 0,
                visas: 0,
                hotels: 0,
                groups: 0,
            });
            setPeriodEntries([]);
            setStep(1);
        }
    }, [open, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues, companySettings?: SegmentSettings) => {
        const effectiveSettings = companySettings || {
            ticketProfitPercentage: 50, visaProfitPercentage: 100, hotelProfitPercentage: 100,
            groupProfitPercentage: 100, alrawdatainSharePercentage: 50,
        };

        const ticketProfits = data.tickets * (effectiveSettings.ticketProfitPercentage / 100);
        const visaProfits = data.visas * (effectiveSettings.visaProfitPercentage / 100);
        const hotelProfits = data.hotels * (effectiveSettings.hotelProfitPercentage / 100);
        const groupProfits = data.groups * (effectiveSettings.groupProfitPercentage / 100);
        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        const alrawdatainShare = total * (effectiveSettings.alrawdatainSharePercentage / 100);
        const mateenShare = total * ((100 - effectiveSettings.alrawdatainSharePercentage) / 100);
        
        const client = clients.find(c => c.id === data.clientId);
        const selectedPartnerOption = partnerOptions.find(p => p.value === data.partnerId);

        
        return { 
            ...data, 
            companyName: client?.name || '',
            clientId: client?.id || '',
            partnerId: selectedPartnerOption?.value.split('-')[1] || '',
            partnerName: selectedPartnerOption?.label || '',
            ticketProfits, 
            otherProfits, 
            total, 
            alrawdatainShare, 
            mateenShare 
        };
    }

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const newEntry = calculateShares(data, company?.segmentSettings);
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0 });
    };

    const removeEntry = (index: number) => {
        setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    }
    
    const goToNextStep = async () => {
        const isValid = await periodForm.trigger();
        if (isValid) {
            setStep(2);
        }
    }

    const handleSavePeriod = async () => {
        const periodData = periodForm.getValues();

        if (periodEntries.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = periodEntries.map((entry) => ({
                ...entry,
                fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'),
                toDate: format(periodData.toDate!, 'yyyy-MM-dd'),
            }));
            
            const result = await addSegmentEntries(finalEntries as any);
            if (!result.success) throw new Error(result.error);
            
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
                 <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>
                         {step === 1 
                            ? "الخطوة 1 من 2: حدد الفترة المحاسبية للسجل."
                            : "الخطوة 2 من 2: أضف بيانات الشركات لهذه الفترة."}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    {step === 1 && (
                        <div className="p-4 border rounded-lg bg-background/50">
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
                    )}

                    {step === 2 && (
                        <>
                             <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold text-base mb-2">إضافة شركة جديدة</h3>
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
                            <div className='p-4 border rounded-lg'>
                                <h3 className="font-semibold text-base mb-2">الشركات المضافة ({periodEntries.length})</h3>
                                <div className='border rounded-lg overflow-hidden'>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>الشركة</TableHead>
                                                <TableHead>الشريك</TableHead>
                                                <TableHead>المجموع</TableHead>
                                                <TableHead>حصة الروضتين</TableHead>
                                                <TableHead>حصة الشريك</TableHead>
                                                <TableHead className='w-[60px] text-center'>حذف</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {periodEntries.length === 0 ? (
                                                <TableRow><TableCell colSpan={6} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                            ) : periodEntries.map((entry, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                                     <TableCell>{entry.partnerName}</TableCell>
                                                    <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                                    <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                                    <TableCell className="font-mono text-green-600">{entry.mateenShare.toFixed(2)}</TableCell>
                                                    <TableCell className='text-center'>
                                                        <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    {step === 1 && (
                        <div className="flex justify-between w-full">
                            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="button" onClick={goToNextStep}>التالي</Button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="flex justify-between w-full">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="me-2 h-4 w-4" />
                                رجوع
                            </Button>
                            <Button type="button" onClick={handleSavePeriod} disabled={isSaving || periodEntries.length === 0} className="sm:w-auto">
                                {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                                حفظ بيانات الفترة ({periodEntries.length} سجلات)
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
