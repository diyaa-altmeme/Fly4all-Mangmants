
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Percent, Settings2, HandCoins, ChevronDown, BadgeCent, DollarSign, User as UserIcon, Wallet, Hash, CheckCircle, ArrowRight, X } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier, Currency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/lib/auth-context';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
});

const partnerSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
    notes: z.string().optional(),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  
  ticketProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  ticketProfitValue: z.coerce.number().min(0).default(50),
  visaProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  visaProfitValue: z.coerce.number().min(0).default(100),
  hotelProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  hotelProfitValue: z.coerce.number().min(0).default(100),
  groupProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  groupProfitValue: z.coerce.number().min(0).default(100),

  hasPartner: z.boolean().default(false),
  distributionType: z.enum(['percentage', 'fixed']).default('percentage'),
  partners: z.array(partnerSchema).optional(),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface AddSegmentPeriodDialogProps {
  onSuccess: () => Promise<void>;
}

export default function AddSegmentPeriodDialog({ onSuccess }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [periodEntries, setPeriodEntries] = useState<Omit<SegmentEntry, 'id' | 'fromDate' | 'toDate'>[]>([]);
    
    const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    const clients = navData?.clients || [];
    const suppliers = navData?.suppliers || [];

    const allCompanyOptions = useMemo(() => {
        return clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings }));
    }, [clients]);

    const partnerOptions = useMemo(() => {
        const allRelations = [...clients, ...suppliers];
        const uniqueRelations = Array.from(new Map(allRelations.map(item => [item.id, item])).values());

        return uniqueRelations.map(r => {
            let labelPrefix = '';
            if (r.relationType === 'client') labelPrefix = 'عميل: ';
            else if (r.relationType === 'supplier') labelPrefix = 'مورد: ';
            else if (r.relationType === 'both') labelPrefix = 'عميل ومورد: ';
            return { value: r.id, label: `${labelPrefix}${r.name}` };
        });
    }, [clients, suppliers]);

    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '',
            tickets: 0,
            visas: 0,
            hotels: 0,
            groups: 0,
            hasPartner: false,
            partners: [],
            distributionType: 'percentage',
            ticketProfitType: 'percentage',
            ticketProfitValue: 50,
            visaProfitType: 'percentage',
            visaProfitValue: 100,
            hotelProfitType: 'percentage',
            hotelProfitValue: 100,
            groupProfitType: 'percentage',
            groupProfitValue: 100,
            notes: ''
        }
    });

    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    useEffect(() => {
        if (open) {
             periodForm.reset({});
             companyForm.reset({
                clientId: '',
                tickets: 0,
                visas: 0,
                hotels: 0,
                groups: 0,
                hasPartner: false,
                partners: [],
                distributionType: 'percentage',
                notes: '',
            });
            setPeriodEntries([]);
        }
    }, [open, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const settings = company?.segmentSettings || {
            ticketProfitValue: data.ticketProfitValue, ticketProfitType: data.ticketProfitType,
            visaProfitValue: data.visaProfitValue, visaProfitType: data.visaProfitType,
            hotelProfitValue: data.hotelProfitValue, hotelProfitType: data.hotelProfitType,
            groupProfitValue: data.groupProfitValue, groupProfitType: data.groupProfitType,
            alrawdatainSharePercentage: 50,
        };

        const getProfit = (count: number, type: 'percentage' | 'fixed', value: number) => {
            if (type === 'percentage') return count * (value / 100);
            return count * value;
        };

        const ticketProfits = getProfit(data.tickets, settings.ticketProfitType, settings.ticketProfitValue);
        const visaProfits = getProfit(data.visas, settings.visaProfitType, settings.visaProfitValue);
        const hotelProfits = getProfit(data.hotels, settings.hotelProfitType, settings.hotelProfitValue);
        const groupProfits = getProfit(data.groups, settings.groupProfitType, settings.groupProfitValue);

        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        
        let alrawdatainShare = total;
        let partnerShare = 0;
        const partnerSharesDetails: { partnerId: string, partnerName: string, share: number }[] = [];

        if (data.hasPartner && data.partners) {
            let totalDistributed = 0;
            if (data.distributionType === 'percentage') {
                data.partners.forEach(p => {
                    const amount = total * (p.value / 100);
                    partnerSharesDetails.push({ partnerId: p.id, partnerName: p.name, share: amount });
                    totalDistributed += amount;
                });
            } else { // fixed
                data.partners.forEach(p => {
                    partnerSharesDetails.push({ partnerId: p.id, partnerName: p.name, share: p.value });
                    totalDistributed += p.value;
                });
            }
            alrawdatainShare = total - totalDistributed;
            partnerShare = totalDistributed;
        }


        return {
            ...data,
            companyName: company?.name || '',
            partnerName: partnerSharesDetails.map(p => p.partnerName).join(', ') || '',
            ticketProfits, 
            otherProfits, 
            total, 
            alrawdatainShare, 
            partnerShare,
            partnerShares: partnerSharesDetails, // For detailed breakdown
        };
    }

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        if (data.hasPartner && (!data.partners || data.partners.length === 0)) {
            toast({ title: 'خطأ', description: 'يجب إضافة شريك واحد على الأقل عند تفعيل خيار الشراكة.', variant: 'destructive'});
            return;
        }
        const newEntry = calculateShares(data);
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ 
            clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0, hasPartner: false, partners: [], distributionType: 'percentage', notes: ''
        });
    };

    const removeEntry = (index: number) => {
        setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    }

    const handleSavePeriod = async () => {
        const periodData = await periodForm.trigger() ? periodForm.getValues() : null;
        if (!periodData || !periodData.fromDate || !periodData.toDate) {
            toast({ title: "بيانات الفترة غير كاملة", description: "الرجاء تحديد تاريخ البدء والانتهاء.", variant: "destructive" });
            return;
        }

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
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الفترة، ثم أضف بيانات الشركات، واحفظ السجل.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    <div className="p-4 border rounded-lg bg-background/50 sticky top-0 z-10">
                        <h3 className="font-semibold text-base mb-2">الفترة المحاسبية</h3>
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

                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-base mb-2">إضافة شركة جديدة</h3>
                        <FormProvider {...companyForm}>
                           <AddCompanyToSegmentForm 
                             allCompanyOptions={allCompanyOptions} 
                             partnerOptions={partnerOptions} 
                             onAddEntry={handleAddCompanyEntry}
                           />
                        </FormProvider>
                    </div>
                    
                    <div className='p-4 border rounded-lg'>
                        <h3 className="font-semibold text-base mb-2">الشركات المضافة ({periodEntries.length})</h3>
                        <div className='border rounded-lg overflow-hidden'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الشركة</TableHead>
                                        <TableHead>الشريك</TableHead>
                                        <TableHead>إجمالي الربح</TableHead>
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
                                            <TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell>
                                            <TableCell className='text-center'>
                                                <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <div className="flex justify-between w-full">
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button type="button" onClick={handleSavePeriod} disabled={isSaving || periodEntries.length === 0} className="sm:w-auto">
                            {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                            حفظ بيانات الفترة ({periodEntries.length} سجلات)
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddCompanyToSegmentForm({ allCompanyOptions, partnerOptions, onAddEntry }: { allCompanyOptions: any[], partnerOptions: any[], onAddEntry: (data: any) => void }) {
    const form = useFormContext<CompanyEntryFormValues>();
    const { control, watch, setValue, handleSubmit, formState } = form;

    const selectedClientId = watch('clientId');
    const hasPartner = watch('hasPartner');

    useEffect(() => {
        const client = allCompanyOptions.find(c => c.value === selectedClientId);
        if (client?.settings) {
            const { settings } = client;
            Object.keys(settings).forEach(key => {
                setValue(key as keyof CompanyEntryFormValues, settings[key]);
            });
        }
    }, [selectedClientId, allCompanyOptions, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'partners'
    });
    
    const [currentPartnerId, setCurrentPartnerId] = useState('');
    const [currentPartnerValue, setCurrentPartnerValue] = useState<number | ''>('');
    const [currentPartnerType, setCurrentPartnerType] = useState<'percentage' | 'fixed'>('percentage');

    const handleAddPartner = () => {
        if (!currentPartnerId || currentPartnerValue === '') return;
        const partner = partnerOptions.find(p => p.value === currentPartnerId);
        if (!partner) return;
        append({
            id: currentPartnerId,
            name: partner.label,
            type: currentPartnerType,
            value: Number(currentPartnerValue)
        });
        setCurrentPartnerId('');
        setCurrentPartnerValue('');
    };

    return (
        <form onSubmit={handleSubmit(onAddEntry)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={control} name="clientId" render={({ field }) => (
                    <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..." /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField control={control} name="tickets" render={({ field }) => (<FormItem><FormLabel>التذاكر</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="visas" render={({ field }) => (<FormItem><FormLabel>الفيزا</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="hotels" render={({ field }) => (<FormItem><FormLabel>الفنادق</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="groups" render={({ field }) => (<FormItem><FormLabel>الكروبات</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <div className="pt-2">
                <FormField
                    control={control}
                    name="hasPartner"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                             <FormLabel className="font-semibold">هل يوجد شركاء في توزيع أرباح هذه الشركة؟</FormLabel>
                        </FormItem>
                    )}
                />
            </div>
            {hasPartner && (
                <div className="p-3 border rounded-md bg-muted/50 space-y-3">
                    <h4 className="font-semibold text-sm">توزيع حصص الشركاء</h4>
                     <div className="flex items-end gap-2">
                        <div className="flex-grow"><Label>الشريك</Label><Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريك..."/></div>
                        <div className="w-24"><Label>النوع</Label><Select value={currentPartnerType} onValueChange={(v: any) => setCurrentPartnerType(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">مبلغ</SelectItem></SelectContent></Select></div>
                        <div className="w-28"><Label>القيمة</Label><Input type="number" value={currentPartnerValue} onChange={(e) => setCurrentPartnerValue(Number(e.target.value))} /></div>
                        <Button type="button" size="icon" className="shrink-0" onClick={handleAddPartner}><PlusCircle className="h-4 w-4"/></Button>
                     </div>
                     {fields.length > 0 && (
                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded-md">
                                    <span className="font-semibold flex-grow">{watch(`partners.${index}.name`)}</span>
                                    <Badge variant="secondary">{watch(`partners.${index}.value`)} {watch(`partners.${index}.type`) === 'percentage' ? '%' : '$'}</Badge>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            )}
             <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className='flex justify-end'>
                <Button type="submit"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
            </div>
        </form>
    )
}
