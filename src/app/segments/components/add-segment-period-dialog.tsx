
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Percent, Settings2, HandCoins, ChevronDown, BadgeCent, DollarSign, User as UserIcon, Wallet, Hash, CheckCircle } from 'lucide-react';
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
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  partnerId: z.string().min(1, { message: "اسم الشريك مطلوب." }),
  currency: z.enum(['USD', 'IQD']),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  
  ticketProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  ticketProfitValue: z.coerce.number().min(0).default(50),
  visaProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  visaProfitValue: z.coerce.number().min(0).default(100),
  hotelProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  hotelProfitValue: z.coerce.number().min(0).default(100),
  groupProfitType: z.enum(['percentage', 'fixed']).default('percentage'),
  groupProfitValue: z.coerce.number().min(0).default(100),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(50),
});

const PairedInput = ({
    form,
    name,
    profitTypeField,
    profitValueField,
    label,
    borderColorClass,
    currency,
}: {
    form: ReturnType<typeof useForm<CompanyEntryFormValues>>;
    name: keyof CompanyEntryFormValues;
    profitTypeField: keyof CompanyEntryFormValues;
    profitValueField: keyof CompanyEntryFormValues;
    label: string;
    borderColorClass: string;
    currency: Currency;
}) => {
    const { control, watch } = form;
    const count = watch(name) as number || 0;
    const profitType = watch(profitTypeField);
    const profitValue = watch(profitValueField) as number || 0;
    
    const result = useMemo(() => {
        if (profitType === 'percentage') {
            return count * (profitValue / 100);
        }
        return count * profitValue;
    }, [count, profitType, profitValue]);
    
    const Icon = profitType === 'percentage' ? Percent : DollarSign;

    return (
        <div className="space-y-1.5">
            <Label className="font-semibold text-sm text-center block">{label}</Label>
            <div className={cn("flex flex-col rounded-lg border-2 overflow-hidden focus-within:ring-2 focus-within:ring-ring", borderColorClass)}>
                <FormField
                    control={control}
                    name={name}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <NumericInput {...field} placeholder="العدد" className="h-9 border-0 rounded-none text-center font-bold text-base" onValueChange={v => field.onChange(v || 0)} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                 <div className="relative">
                    <div className="flex items-center justify-center h-9 bg-muted/50 font-mono font-bold text-primary">
                        {result.toFixed(2)}
                         <span className="text-xs ms-1">{currency}</span>
                    </div>
                    <Label className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">الناتج</Label>
                 </div>
                 <CollapsibleContent asChild>
                    <div className="p-2 bg-muted/70 border-t flex items-center gap-2">
                        <FormField
                            control={control}
                            name={profitValueField}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                       <div className="relative">
                                         <NumericInput {...field} placeholder="القيمة" className="pe-8 text-center" onValueChange={v => field.onChange(v || 0)} />
                                         <Icon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                       </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </CollapsibleContent>
            </div>
        </div>
    );
};


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: (newEntries: SegmentEntry[]) => Promise<void>;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<Omit<SegmentEntry, 'id' | 'fromDate' | 'toDate'>[]>([]);
    const [isCommissionSettingsOpen, setIsCommissionSettingsOpen] = useState(false);
    const { user: currentUser } = useAuth();
    const { data: navData } = useVoucherNav();
    
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
            partnerId: '',
            currency: 'USD',
            tickets: 0,
            visas: 0,
            hotels: 0,
            groups: 0,
            ticketProfitType: 'percentage',
            ticketProfitValue: 50,
            visaProfitType: 'percentage',
            visaProfitValue: 100,
            hotelProfitType: 'percentage',
            hotelProfitValue: 100,
            groupProfitType: 'percentage',
            groupProfitValue: 100,
            alrawdatainSharePercentage: 50,
        }
    });
    
    const boxName = useMemo(() => {
        if (!currentUser || !('boxId' in currentUser)) return 'غير محدد';
        return navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد';
    }, [currentUser, navData?.boxes]);

    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    useEffect(() => {
        if (open) {
             periodForm.reset({});
             companyForm.reset({
                clientId: '',
                partnerId: '',
                currency: 'USD',
                tickets: 0,
                visas: 0,
                hotels: 0,
                groups: 0,
                ticketProfitType: 'percentage',
                ticketProfitValue: 50,
                visaProfitType: 'percentage',
                visaProfitValue: 100,
                hotelProfitType: 'percentage',
                hotelProfitValue: 100,
                groupProfitType: 'percentage',
                groupProfitValue: 100,
                alrawdatainSharePercentage: 50,
            });
            setPeriodEntries([]);
        }
    }, [open, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues) => {
        const client = clients.find(c => c.id === data.clientId);
        
        const getProfit = (count: number, type: 'percentage' | 'fixed', value: number) => {
            if (type === 'percentage') return (count || 0) * ((value || 0) / 100);
            return (count || 0) * (value || 0);
        };
        
        const ticketProfits = getProfit(data.tickets, data.ticketProfitType, data.ticketProfitValue);
        const visaProfits = getProfit(data.visas, data.visaProfitType, data.visaProfitValue);
        const hotelProfits = getProfit(data.hotels, data.hotelProfitType, data.hotelProfitValue);
        const groupProfits = getProfit(data.groups, data.groupProfitType, data.groupProfitValue);

        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        
        const alrawdatainSharePercentage = data.alrawdatainSharePercentage;
        
        const alrawdatainShare = total * (alrawdatainSharePercentage / 100);
        const partnerShare = total - alrawdatainShare;
        
        const selectedPartnerOption = partnerOptions.find(p => p.value === data.partnerId);

        return { 
            ...data,
            companyName: client?.name || '',
            clientId: client?.id || '',
            partnerId: selectedPartnerOption?.value || '',
            partnerName: selectedPartnerOption?.label || '',
            ticketProfits, 
            otherProfits, 
            total, 
            alrawdatainShare, 
            partnerShare,
            alrawdatainSharePercentage,
        };
    }
    
    // Auto-fill settings when client changes
    const selectedClientId = companyForm.watch('clientId');
    useEffect(() => {
        const clientOption = allCompanyOptions.find(opt => opt.value === selectedClientId);
        const clientSettings = clientOption?.settings;
        if (clientSettings) {
            companyForm.reset({
                ...companyForm.getValues(),
                ...clientSettings,
            });
            toast({
                title: 'تم تحميل الإعدادات',
                description: `تم تحميل الإعدادات المالية المحفوظة لشركة ${clientOption.label}`,
                className: 'bg-green-100 dark:bg-green-900'
            })
        }
    }, [selectedClientId, allCompanyOptions, companyForm, toast]);


    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const newEntry = calculateShares(data);
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ 
            clientId: '', partnerId: '', currency: 'USD', tickets: 0, visas: 0, hotels: 0, groups: 0,
            ticketProfitType: 'percentage',
            ticketProfitValue: 50,
            visaProfitType: 'percentage',
            visaProfitValue: 100,
            hotelProfitType: 'percentage',
            hotelProfitValue: 100,
            groupProfitType: 'percentage',
            groupProfitValue: 100,
            alrawdatainSharePercentage: 50,
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
            if (!result.success || !result.newEntries) throw new Error(result.error);
            
            toast({ title: "تم حفظ بيانات الفترة بنجاح" });
            setOpen(false);
            onSuccess(result.newEntries);
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message || "لم يتم حفظ البيانات.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleGlobalProfitTypeChange = (value: 'percentage' | 'fixed') => {
        companyForm.setValue('ticketProfitType', value);
        companyForm.setValue('visaProfitType', value);
        companyForm.setValue('hotelProfitType', value);
        companyForm.setValue('groupProfitType', value);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الفترة، ثم أضف بيانات الشركات، واحفظ السجل.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    <div className="p-4 border rounded-lg bg-background/50">
                        <h3 className="font-semibold text-base mb-4">الفترة المحاسبية</h3>
                        <Form {...periodForm}>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
                                <FormField control={periodForm.control} name="fromDate" render={({ field }) => (
                                    <FormItem><FormLabel>من تاريخ</FormLabel><Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsFromCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                <FormField control={periodForm.control} name="toDate" render={({ field }) => (
                                    <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsToCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                            </form>
                        </Form>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-base mb-2">إضافة شركة جديدة</h3>
                        <Form {...companyForm}>
                            <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={companyForm.control} name="partnerId" render={({ field }) => (
                                        <FormItem><FormLabel>الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شريك..."/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={companyForm.control} name="clientId" render={({ field }) => {
                                        const hasSettings = allCompanyOptions.find(o => o.value === field.value)?.settings;
                                        return (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">الشركة المصدرة للسكمنت {hasSettings && <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 me-1"/>إعدادات محفوظة</Badge>}</FormLabel>
                                                <FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage />
                                            </FormItem>
                                        )
                                    }}/>
                                </div>
                                <Collapsible open={isCommissionSettingsOpen} onOpenChange={setIsCommissionSettingsOpen}>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <PairedInput form={companyForm} name="tickets" profitTypeField="ticketProfitType" profitValueField="ticketProfitValue" label="التذاكر" borderColorClass="border-blue-500/50 focus-within:ring-blue-500/50" currency={companyForm.getValues('currency')} />
                                        <PairedInput form={companyForm} name="visas" profitTypeField="visaProfitType" profitValueField="visaProfitValue" label="الفيزا" borderColorClass="border-green-500/50 focus-within:ring-green-500/50" currency={companyForm.getValues('currency')} />
                                        <PairedInput form={companyForm} name="hotels" profitTypeField="hotelProfitType" profitValueField="hotelProfitValue" label="الفنادق" borderColorClass="border-orange-500/50 focus-within:ring-orange-500/50" currency={companyForm.getValues('currency')} />
                                        <PairedInput form={companyForm} name="groups" profitTypeField="groupProfitType" profitValueField="groupProfitValue" label="الكروبات" borderColorClass="border-purple-500/50 focus-within:ring-purple-500/50" currency={companyForm.getValues('currency')} />
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <CollapsibleTrigger asChild>
                                            <Button type="button" variant="outline" size="sm" className="h-10">
                                                <Settings2 className="me-2 h-4 w-4"/>
                                                الاعدادت المالية
                                            </Button>
                                        </CollapsibleTrigger>
                                        <div className={cn("flex items-center gap-4 transition-opacity", !isCommissionSettingsOpen && "opacity-0 pointer-events-none")}>
                                            <div className="flex items-center gap-2">
                                                <Label className="font-bold">نوع العمولة للكل</Label>
                                                <Select onValueChange={handleGlobalProfitTypeChange} defaultValue="percentage">
                                                    <SelectTrigger className="w-[150px] h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                                                        <SelectItem value="fixed">مبلغ ثابت ($)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Separator orientation="vertical" className="h-6" />
                                            <div className="flex items-center gap-2">
                                                <Label className="font-bold whitespace-nowrap">نسبة الأرباح لنا</Label>
                                                <div className="relative w-28">
                                                    <FormField control={companyForm.control} name="alrawdatainSharePercentage" render={({ field }) => ( <NumericInput {...field} className="pe-8 text-center h-10" onValueChange={v => field.onChange(v || 0)}/> )}/>
                                                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Collapsible>
                                <div className='flex justify-end pt-4 border-t mt-4'>
                                    <Button type="submit" className="h-10"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
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
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-primary"/> <span>{currentUser?.name || '...'}</span></div>
                             {currentUser && 'role' in currentUser && currentUser.boxId && (
                                <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary"/> <span>{boxName}</span></div>
                            )}
                            <div className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                        </div>
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

    