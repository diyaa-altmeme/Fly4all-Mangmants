
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier, PartnerShareSetting } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { updateSegmentEntry, deleteSegmentPeriod, addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { updateClient } from '@/app/clients/actions';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { defaultSettingsData } from '@/lib/defaults';
import { produce } from 'immer';

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
  
  ticketsSaleAmount: z.coerce.number().optional().default(0),
  visasSaleAmount: z.coerce.number().optional().default(0),
  hotelsSaleAmount: z.coerce.number().optional().default(0),
  groupsSaleAmount: z.coerce.number().optional().default(0),
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
                     <FormField control={form.control} name="tickets" render={({ field }) => (<FormItem><FormLabel>التذاكر</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="visas" render={({ field }) => (<FormItem><FormLabel>الفيزا</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="hotels" render={({ field }) => (<FormItem><FormLabel>الفنادق</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="groups" render={({ field }) => (<FormItem><FormLabel>الكروبات</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
                 <div className='flex justify-end items-center gap-2'>
                    <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
                    <Button type="submit"><Pencil className='me-2 h-4 w-4'/> تحديث البيانات</Button>
                 </div>
            </form>
        </Form>
    );
}

export default function EditSegmentPeriodDialog({ existingPeriod, clients: initialClients, suppliers, onSuccess }: EditSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<(Omit<SegmentEntry, 'fromDate' | 'toDate'>)[]>([]);
    const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

    const [clients, setClients] = useState(initialClients);
    const allPartners = useMemo(() => [...clients, ...suppliers], [clients, suppliers]);

    const allCompanyOptions = useMemo(() => {
        return clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name }));
    }, [clients]);

     const partnerOptions = useMemo(() => {
        const clientPartners = clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: `شركة: ${c.name}` }));
        const supplierPartners = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
        return [...clientPartners, ...supplierPartners];
    }, [clients, suppliers]);
    
    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    const periodForm = useForm<PeriodFormValues>({
      resolver: zodResolver(periodSchema),
      defaultValues: { fromDate: parseISO(existingPeriod.fromDate), toDate: parseISO(existingPeriod.toDate) },
    });

    const companyForm = useForm<CompanyEntryFormValues>({ resolver: zodResolver(companyEntrySchema) });

     const selectedClientId = companyForm.watch('clientId');
    const selectedPartnerId = companyForm.watch('partnerId');
    const selectedCompany = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
    const selectedPartner = useMemo(() => allPartners.find(p => p.id === selectedPartnerId), [allPartners, selectedPartnerId]);
    
    const defaultSegmentSettings = useMemo(() => defaultSettingsData.voucherSettings?.distributed?.segmentSettings || {
        tickets: { type: 'fixed', value: 1 }, visas: { type: 'fixed', value: 1 },
        hotels: { type: 'fixed', value: 1 }, groups: { type: 'fixed', value: 1 },
    }, []);

    const [currentClientSettings, setCurrentClientSettings] = useState<SegmentSettings>(defaultSegmentSettings);
    const [currentPartnerSettings, setCurrentPartnerSettings] = useState<PartnerShareSetting>({type: 'percentage', value: 50});
    
    useEffect(() => {
        setCurrentClientSettings(selectedCompany?.segmentSettings || defaultSegmentSettings);
    }, [selectedCompany, defaultSegmentSettings]);

     useEffect(() => {
        setCurrentPartnerSettings(selectedPartner?.partnerShareSettings || {type: 'percentage', value: 50});
    }, [selectedPartner]);
    
    const watchedCompanyForm = companyForm.watch();
    
    const calculatedShares = useMemo(() => 
        calculateShares(watchedCompanyForm, currentClientSettings, currentPartnerSettings),
    [watchedCompanyForm, currentClientSettings, currentPartnerSettings]);


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

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        if (!selectedCompany || !selectedPartner) return;
        const newEntry = {
            ...data, ...calculatedShares, companyName: selectedCompany.name, partnerName: selectedPartner.name, clientSettingsUsed: currentClientSettings, partnerSettingsUsed: currentPartnerSettings
        };
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0, ticketsSaleAmount: 0, visasSaleAmount: 0, hotelsSaleAmount: 0, groupsSaleAmount: 0 });
    };

    const handleUpdateCompanyEntry = (index: number, data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const partner = [...clients, ...suppliers].find(p => p.id === data.partnerId);
        if (!company || !partner) return;
        
        const updatedEntry = calculateShares(data, company.segmentSettings!, partner.partnerShareSettings!);
        const updatedEntries = [...periodEntries];
        updatedEntries[index] = {...updatedEntries[index], ...updatedEntry, clientSettingsUsed: company.segmentSettings!, partnerSettingsUsed: partner.partnerShareSettings!};
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
    
    const handleSaveClientSettings = async () => {
        if (!selectedCompany) return;
        const result = await updateClient(selectedCompany.id, { segmentSettings: currentClientSettings });
        if(result.success && result.updatedClient) {
            setClients(produce(clients, draft => {
                const index = draft.findIndex(c => c.id === result.updatedClient!.id);
                if (index !== -1) draft[index] = result.updatedClient;
            }));
            toast({ title: "تم حفظ إعدادات الشركة" });
        } else {
             toast({ title: "خطأ", description: "لم يتم حفظ الإعدادات", variant: 'destructive' });
        }
    }

    const handleSavePartnerSettings = async () => {
        if (!selectedPartner) return;
        const result = await updateClient(selectedPartner.id, { partnerShareSettings: currentPartnerSettings });
         if(result.success && result.updatedClient) {
            const updatedAllPartners = produce(allPartners, draft => {
                const index = draft.findIndex(c => c.id === result.updatedClient!.id);
                if (index !== -1) draft[index] = result.updatedClient;
            })
            setClients(updatedAllPartners.filter(p => p.relationType !== 'supplier') as Client[]);
            toast({ title: "تم حفظ إعدادات الشريك" });
        } else {
            toast({ title: "خطأ", description: "لم يتم حفظ الإعدادات", variant: 'destructive' });
        }
    }
    
    const renderCalculationFields = (service: 'tickets' | 'visas' | 'hotels' | 'groups', label: string) => {
        const settingType = currentCompanySettings?.[service]?.type || 'fixed';
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-center bg-muted py-1 rounded-md">{label}</h4>
                <div className={cn("grid gap-2", settingType === 'percentage' ? "grid-cols-2" : "grid-cols-1")}>
                     <FormField control={companyForm.control} name={service} render={({ field }) => (
                         <FormItem><FormLabel>العدد</FormLabel><FormControl><NumericInput {...field} onValueChange={v => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    {settingType === 'percentage' && (
                         <FormField control={companyForm.control} name={`${service}SaleAmount`} render={({ field }) => (
                            <FormItem><FormLabel>إجمالي المبيع</FormLabel><FormControl><NumericInput {...field} onValueChange={v => field.onChange(v || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                </div>
            </div>
        )
    }

    const { getValues } = companyForm;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="me-2 h-4 w-4" />
                    تعديل الفترة
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>تعديل سجل سكمنت</DialogTitle>
                    <DialogDescription>عدّل بيانات الفترة، ثم أضف أو عدّل الشركات، ثم احفظ الفترة كاملة.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
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
                                {periodEntries.map((entry, index) => (
                                    <Collapsible asChild key={entry.id || index} open={openRowIndex === index} onOpenChange={() => setOpenRowIndex(prev => prev === index ? null : index)}>
                                        <tbody className="border-t">
                                            <TableRow className="cursor-pointer" onClick={() => setOpenRowIndex(prev => prev === index ? null : index)}>
                                                <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                                <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell>
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
                                        </tbody>
                                    </Collapsible>
                                ))}
                                 <TableBody>
                                 {periodEntries.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">لا توجد سجلات. سيتم حذف الفترة عند الحفظ.</TableCell></TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-base mb-2">الخطوة 3: إضافة شركة جديدة</h3>
                        <Form {...companyForm}>
                            <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                                <Card><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={companyForm.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={companyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={companyForm.control} name="partnerId" render={({ field }) => (<FormItem><FormLabel>الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شريك..."/></FormControl><FormMessage /></FormItem>)}/>
                                </CardContent></Card>
                                {selectedCompany && selectedPartner && (
                                    <Accordion type="single" collapsible className="w-full space-y-4">
                                        <AccordionItem value="company-settings" className="border-none">
                                            <Card><AccordionTrigger className="px-4 py-3 font-semibold text-base hover:no-underline">إعدادات حساب الربح لـ <span className="text-primary mx-1">{selectedCompany.name}</span></AccordionTrigger><AccordionContent className="p-4 border-t"><CompanySettingsForm company={selectedCompany} onSettingsUpdate={setCurrentClientSettings} onSave={handleSaveClientSettings} /></AccordionContent></Card>
                                        </AccordionItem>
                                            <AccordionItem value="partner-settings" className="border-none">
                                            <Card><AccordionTrigger className="px-4 py-3 font-semibold text-base hover:no-underline">إعدادات توزيع الحصص مع <span className="text-primary mx-1">{selectedPartner.name}</span></AccordionTrigger><AccordionContent className="p-4 border-t"><PartnerSettingsForm partner={selectedPartner} onSettingsUpdate={setCurrentPartnerSettings} onSave={handleSavePartnerSettings} /></AccordionContent></Card>
                                        </AccordionItem>
                                    </Accordion>
                                )}
                                {selectedCompany && selectedPartner && (
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">إدخال أعداد الخدمات</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {renderCalculationFields('tickets', 'التذاكر')}
                                            {renderCalculationFields('visas', 'الفيزا')}
                                            {renderCalculationFields('hotels', 'الفنادق')}
                                            {renderCalculationFields('groups', 'الكروبات')}
                                        </CardContent>
                                        <CardFooter>
                                             <div className="w-full space-y-4">
                                                 <h4 className="font-semibold text-base">معاينة النتائج</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                                    <div className="p-2 bg-muted rounded-md"><Label className="text-xs">إجمالي الربح</Label><p className="font-bold font-mono">{calculatedShares.total.toFixed(2)}</p></div>
                                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md"><Label className="text-xs">حصة الروضتين</Label><p className="font-bold font-mono">{calculatedShares.alrawdatainShare.toFixed(2)}</p></div>
                                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md"><Label className="text-xs">حصة الشريك</Label><p className="font-bold font-mono">{calculatedShares.partnerShare.toFixed(2)}</p></div>
                                                    <Button type="submit" className="self-end"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
                                                </div>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                )}
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
