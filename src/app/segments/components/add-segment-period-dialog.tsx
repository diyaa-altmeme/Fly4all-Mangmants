
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Settings, Info, Save } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier, PartnerShareSetting } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

// ----- Calculation Logic -----
const calculateShares = (data: CompanyEntryFormValues, clientSettings: SegmentSettings, partnerSettings: PartnerShareSetting) => {
    const { tickets, visas, hotels, groups, ticketsSaleAmount, visasSaleAmount, hotelsSaleAmount, groupsSaleAmount } = data;
    
    const getProfit = (count: number, saleAmount: number | undefined, setting: SegmentSettings['tickets']) => {
        if (!setting || !setting.type) return 0;
        if (setting.type === 'fixed') {
            return count * (setting.value || 0);
        }
        if (setting.type === 'percentage') {
            return (saleAmount || 0) * ((setting.value || 0) / 100);
        }
        return 0;
    };

    const ticketProfits = getProfit(tickets, ticketsSaleAmount, clientSettings.tickets);
    const visaProfits = getProfit(visas, visasSaleAmount, clientSettings.visas);
    const hotelProfits = getProfit(hotels, hotelsSaleAmount, clientSettings.hotels);
    const groupProfits = getProfit(groups, groupsSaleAmount, clientSettings.groups);
    
    const otherProfits = visaProfits + hotelProfits + groupProfits;
    const total = ticketProfits + otherProfits;
    
    let alrawdatainShare = 0;
    let partnerShare = 0;

    if (partnerSettings.type === 'percentage') {
        partnerShare = total * (partnerSettings.value / 100);
        alrawdatainShare = total - partnerShare;
    } else { // fixed
        partnerShare = partnerSettings.value;
        alrawdatainShare = total - partnerShare;
    }
    
    return { ticketProfits, otherProfits, total, alrawdatainShare, partnerShare };
};

const CompanySettingsForm = ({ company, onSettingsUpdate }: { company: Client; onSettingsUpdate: (settings: SegmentSettings) => void }) => {
    const [localSettings, setLocalSettings] = useState<SegmentSettings>(
        company.segmentSettings || defaultSettingsData.voucherSettings?.distributed?.segmentSettings || {
            tickets: { type: 'fixed', value: 1 }, visas: { type: 'fixed', value: 1 },
            hotels: { type: 'fixed', value: 1 }, groups: { type: 'fixed', value: 1 },
        }
    );

    useEffect(() => { onSettingsUpdate(localSettings); }, [localSettings, onSettingsUpdate]);

    const handleSettingChange = (service: keyof SegmentSettings, key: 'type' | 'value', value: any) => {
        setLocalSettings(produce(draft => { (draft[service] as any)[key] = value; }));
    };
    
    const renderField = (service: 'tickets' | 'visas' | 'hotels' | 'groups', label: string) => {
        const serviceSettings = localSettings[service];
        return (
            <div className="space-y-1">
                 <Label className="text-xs">{label}</Label>
                 <div className="grid grid-cols-2 gap-2">
                    <Select value={serviceSettings.type} onValueChange={(v) => handleSettingChange(service, 'type', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="fixed">قيمة ثابتة ($)</SelectItem><SelectItem value="percentage">نسبة مئوية (%)</SelectItem></SelectContent>
                    </Select>
                     <NumericInput value={serviceSettings.value} onValueChange={(v) => handleSettingChange(service, 'value', v || 0)} className="h-8" />
                </div>
            </div>
        )
    };

    return (
        <Card><CardContent className="pt-6 space-y-4">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {renderField('tickets', 'التذاكر')}
                {renderField('visas', 'الفيزا')}
                {renderField('hotels', 'الفنادق')}
                {renderField('groups', 'الكروبات')}
            </div>
        </CardContent></Card>
    );
};

// ----- Main Dialog Component -----
export default function AddSegmentPeriodDialog({ clients: initialClients, suppliers, onSuccess }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [periodEntries, setPeriodEntries] = useState<Omit<SegmentEntry, 'id' | 'fromDate' | 'toDate'>[]>([]);
    
    const allPartners = useMemo(() => [...initialClients, ...suppliers], [initialClients, suppliers]);

    const partnerOptions = useMemo(() => {
        return allPartners.map(p => ({ value: p.id, label: p.name }));
    }, [allPartners]);

    const companyOptions = useMemo(() => initialClients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name })), [initialClients]);
    
    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const companyForm = useForm<CompanyEntryFormValues>({ resolver: zodResolver(companyEntrySchema) });

    const selectedClientId = companyForm.watch('clientId');
    const selectedPartnerId = companyForm.watch('partnerId');
    const selectedCompany = useMemo(() => initialClients.find(c => c.id === selectedClientId), [initialClients, selectedClientId]);
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
            periodForm.reset({});
            companyForm.reset({ clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0 });
            setPeriodEntries([]);
            setStep(1);
        }
    }, [open, periodForm, companyForm]);

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        if (!selectedCompany || !selectedPartner) return;
        const newEntry = {
            ...data, ...calculatedShares, companyName: selectedCompany.name, partnerName: selectedPartner.name, clientSettingsUsed: currentClientSettings, partnerSettingsUsed: currentPartnerSettings
        };
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0, ticketsSaleAmount: 0, visasSaleAmount: 0, hotelsSaleAmount: 0, groupsSaleAmount: 0 });
    };

    const removeEntry = (index: number) => setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    const goToNextStep = async () => { if (await periodForm.trigger()) setStep(2); };

    const handleSavePeriod = async () => {
        const periodData = periodForm.getValues();
        if (periodEntries.length === 0) { toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" }); return; }
        setIsSaving(true);
        try {
            const finalEntries = periodEntries.map(entry => ({ ...entry, fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'), toDate: format(periodData.toDate!, 'yyyy-MM-dd') }));
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
    
    const renderCalculationFields = (service: 'tickets' | 'visas' | 'hotels' | 'groups', label: string) => {
        const settingType = selectedCompany?.segmentSettings?.[service]?.type || 'fixed';
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button></DialogTrigger>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>إضافة سجل سكمنت جديد</DialogTitle><DialogDescription>{step === 1 ? "الخطوة 1: حدد الفترة." : "الخطوة 2: أدخل بيانات الشركات."}</DialogDescription></DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    {step === 1 && (
                        <div className="p-4 border rounded-lg bg-background/50">
                             <Form {...periodForm}><form className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <FormField control={periodForm.control} name="fromDate" render={({ field }) => (<FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <FormField control={periodForm.control} name="toDate" render={({ field }) => (<FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                            </form></Form>
                        </div>
                    )}
                    {step === 2 && (
                        <>
                            <Form {...companyForm}>
                                <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                                    <Card><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={companyForm.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={companyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={companyForm.control} name="partnerId" render={({ field }) => (<FormItem><FormLabel>الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شريك..."/></FormControl><FormMessage /></FormItem>)}/>
                                    </CardContent></Card>
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
                            <Card><CardHeader><CardTitle>الشركات المضافة ({periodEntries.length})</CardTitle></CardHeader><CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>الشريك</TableHead><TableHead>المجموع</TableHead><TableHead>حصة الروضتين</TableHead><TableHead>حصة الشريك</TableHead><TableHead className='w-[60px] text-center'>حذف</TableHead></TableRow></TableHeader>
                                    <TableBody>{periodEntries.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>) : periodEntries.map((entry, index) => (
                                        <TableRow key={index}><TableCell className="font-semibold">{entry.companyName}</TableCell><TableCell>{entry.partnerName}</TableCell><TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell><TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell><TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell><TableCell className='text-center'><Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button></TableCell></TableRow>
                                    ))}</TableBody>
                                </Table>
                            </CardContent></Card>
                        </>
                    )}
                </div>
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    {step === 1 && <div className="flex justify-end w-full"><Button type="button" onClick={goToNextStep}>التالي<ArrowLeft className="ms-2 h-4 w-4" /></Button></div>}
                    {step === 2 && <div className="flex justify-between w-full"><Button variant="outline" onClick={() => setStep(1)}>رجوع</Button><Button type="button" onClick={handleSavePeriod} disabled={isSaving || periodEntries.length === 0}><Save className="me-2 h-4 w-4"/>حفظ بيانات الفترة ({periodEntries.length} سجلات)</Button></div>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
