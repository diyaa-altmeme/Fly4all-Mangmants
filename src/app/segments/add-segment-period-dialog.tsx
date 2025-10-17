

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
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Currency, Client, Supplier, Subscription, User, Box, SegmentEntry, SegmentSettings, PartnerShareSetting } from '@/lib/types';
import { Loader2, Calendar as CalendarIcon, PlusCircle, User as UserIcon, Hash, Wallet, ArrowLeft, ArrowRight, X, Building, Store, Settings2, Save, Trash2, Percent, HandCoins, ChevronDown, BadgeCent, DollarSign, Calculator } from 'lucide-react';
import { addSegmentEntries } from '@/app/segments/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { NumericInput } from '@/components/ui/numeric-input';
import { useAuth } from '@/lib/auth-context';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, parseISO } from 'date-fns';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { cn } from '@/lib/utils';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';


const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.enum(['USD', 'IQD']).default('USD'),
  entries: z.array(z.any()).min(1, "يجب إضافة شركة واحدة على الأقل."),
});

const partnerSchema = z.object({
    id: z.string().min(1, "اسم الشريك مطلوب."),
    name: z.string(),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
    shareAmount: z.coerce.number(),
    notes: z.string().optional(),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  hasPartner: z.boolean().default(false),
  partners: z.array(partnerSchema).optional(),
  
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),

  ticketProfitType: z.enum(['percentage', 'fixed']).default('fixed'),
  ticketProfitValue: z.coerce.number().min(0).default(1),
  visaProfitType: z.enum(['percentage', 'fixed']).default('fixed'),
  visaProfitValue: z.coerce.number().min(0).default(1),
  hotelProfitType: z.enum(['percentage', 'fixed']).default('fixed'),
  hotelProfitValue: z.coerce.number().min(0).default(1),
  groupProfitType: z.enum(['percentage', 'fixed']).default('fixed'),
  groupProfitValue: z.coerce.number().min(0).default(1),
  
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(50),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
  children?: React.ReactNode;
}

const StatCard = ({ title, value, currency, symbol, className }: { title: string; value: number; currency: string; symbol: string; className?: string }) => (
    <div className={cn("text-center p-2 rounded-lg bg-background border", className)}>
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <div className="flex items-center justify-center gap-2">
            <p className="font-bold font-mono text-base">
                {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
             <span className="text-sm font-semibold">{symbol}</span>
        </div>
    </div>
);


const ServiceCard = ({ name, countFieldName, typeFieldName, valueFieldName, borderColorClass, calculatedProfit, currencySymbol }: {
    name: string;
    countFieldName: keyof CompanyEntryFormValues;
    typeFieldName: keyof CompanyEntryFormValues;
    valueFieldName: keyof CompanyEntryFormValues;
    borderColorClass: string;
    calculatedProfit: number;
    currencySymbol: string;
}) => {
    const { control } = useFormContext<CompanyEntryFormValues>();
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className={cn("rounded-2xl border-2 p-3 space-y-2 bg-card", borderColorClass)}>
            <h4 className="text-center font-bold text-sm">{name}</h4>
            <Controller
                control={control}
                name={countFieldName as any}
                render={({ field }) => (
                    <NumericInput
                        {...field}
                        onValueChange={(v) => field.onChange(v || 0)}
                        className="text-center text-2xl font-bold h-12 bg-muted/50"
                    />
                )}
            />
            <div className="text-center text-sm font-mono text-green-600 font-bold bg-muted/50 p-1 rounded-md">
                الناتج: {calculatedProfit.toFixed(2)} {currencySymbol}
            </div>
             <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-xs">
                        <Settings2 className="me-1 h-3 w-3"/>
                        الإعدادات المالية
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                     <div className="mt-2 space-y-2 border-t pt-2">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">نوع العمولة</Label>
                            <Controller control={control} name={typeFieldName as any} render={({field}) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="fixed">مبلغ ثابت</SelectItem><SelectItem value="percentage">نسبة %</SelectItem></SelectContent>
                                </Select>
                            )} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">القيمة</Label>
                             <Controller control={control} name={valueFieldName as any} render={({field}) => (
                                 <NumericInput {...field} onValueChange={v => field.onChange(v || 0)} className="h-7" />
                             )}/>
                        </div>
                    </div>
                </CollapsibleContent>
             </Collapsible>
        </div>
    );
};


function AddCompanyToSegmentForm({ allCompanyOptions, partnerOptions, onAddEntry }: { allCompanyOptions: any[], partnerOptions: any[], onAddEntry: (data: CompanyEntryFormValues) => void }) {
    const periodForm = useFormContext<PeriodFormValues>();
    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '', tickets: 0, visas: 0, hotels: 0, groups: 0,
            hasPartner: false, partners: [],
            ticketProfitType: 'fixed', ticketProfitValue: 1,
            visaProfitType: 'fixed', visaProfitValue: 1,
            hotelProfitType: 'fixed', hotelProfitValue: 1,
            groupProfitType: 'fixed', groupProfitValue: 1,
            alrawdatainSharePercentage: 50,
        }
    });

    const { control, watch, setValue, handleSubmit: handleCompanyFormSubmit, formState: { errors } } = companyForm;
    const { toast } = useToast();

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

    const { fields, append, remove } = useFieldArray({ control, name: 'partners' });
    
    const [currentPartnerId, setCurrentPartnerId] = useState('');
    const [currentPartnerValue, setCurrentPartnerValue] = useState<number | ''>('');
    const [currentPartnerType, setCurrentPartnerType] = useState<'percentage' | 'fixed'>('percentage');

    const calculatedTicketProfit = useMemo(() => {
        const { tickets, ticketProfitType, ticketProfitValue } = watch();
        return ticketProfitType === 'fixed' ? (tickets || 0) * (ticketProfitValue || 0) : 0;
    }, [watch]);

    const calculatedVisaProfit = useMemo(() => {
        const { visas, visaProfitType, visaProfitValue } = watch();
        return visaProfitType === 'fixed' ? (visas || 0) * (visaProfitValue || 0) : 0;
    }, [watch]);
    
    const calculatedHotelProfit = useMemo(() => {
        const { hotels, hotelProfitType, hotelProfitValue } = watch();
        return hotelProfitType === 'fixed' ? (hotels || 0) * (hotelProfitValue || 0) : 0;
    }, [watch]);

    const calculatedGroupProfit = useMemo(() => {
        const { groups, groupProfitType, groupProfitValue } = watch();
        return groupProfitType === 'fixed' ? (groups || 0) * (groupProfitValue || 0) : 0;
    }, [watch]);

    const calculatedTotalProfit = useMemo(() => {
        return calculatedTicketProfit + calculatedVisaProfit + calculatedHotelProfit + calculatedGroupProfit;
    }, [calculatedTicketProfit, calculatedVisaProfit, calculatedHotelProfit, calculatedGroupProfit]);

    const totalPartnerShareAmount = useMemo(() => 
        (watch('partners') || []).reduce((acc, p) => acc + (p.shareAmount || 0), 0), 
    [watch]);

    const alrawdatainShareAmount = calculatedTotalProfit - totalPartnerShareAmount;

    const currentPartnerShareAmount = useMemo(() => {
        if (!currentPartnerValue) return 0;
        if (currentPartnerType === 'fixed') return Number(currentPartnerValue);
        
        const profitForPartners = calculatedTotalProfit * (1 - ((watch('alrawdatainSharePercentage') || 0) / 100));
        const remainingForNewPartner = profitForPartners - totalPartnerShareAmount;

        return remainingForNewPartner * (Number(currentPartnerValue) / 100);

    }, [currentPartnerValue, currentPartnerType, calculatedTotalProfit, totalPartnerShareAmount, watch]);


    const handleAddPartner = () => {
      if(!currentPartnerId || currentPartnerValue === '') {
          toast({ title: "الرجاء تحديد الشريك والقيمة", variant: 'destructive' });
          return;
      }
      const newValue = Number(currentPartnerValue);
      if (isNaN(newValue) || newValue <= 0) {
          toast({ title: "القيمة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
          return;
      }
      
      const totalPartnerSharesAfterAdd = totalPartnerShareAmount + currentPartnerShareAmount;
      if (totalPartnerSharesAfterAdd > calculatedTotalProfit + 0.01) {
          toast({ title: "تجاوز إجمالي الربح", description: "مجموع حصص الشركاء يتجاوز إجمالي الربح المتاح.", variant: 'destructive' });
          return;
      }

      const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
      if(!selectedPartner) {
           toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
           return;
      }
      
      const newPartner: PartnerFormValues = { id: selectedPartner.value, name: selectedPartner.label, type: currentPartnerType, value: newValue, shareAmount: currentPartnerShareAmount, notes: '' };
      append(newPartner);
      setCurrentPartnerId('');
      setCurrentPartnerValue('');
    };

    const currency = periodForm.watch('currency');
    const currencySymbol = currency === 'IQD' ? 'ع.د' : '$';

    return (
        <FormProvider {...companyForm}>
             <div className="p-4 border rounded-lg bg-background/50">
                <h3 className="font-semibold text-lg mb-2">إضافة شركة جديدة للفترة</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={control} name="clientId" render={({ field }) => (
                            <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="hasPartner" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-background mt-3">
                                <Label className="font-semibold">هل يوجد شركاء في توزيع أرباح هذه الشركة؟</Label>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-base mb-2">إدخال الكميات</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ServiceCard name='التذاكر' countFieldName='tickets' typeFieldName='ticketProfitType' valueFieldName='ticketProfitValue' borderColorClass="border-blue-300" calculatedProfit={calculatedTicketProfit} currencySymbol={currencySymbol} />
                            <ServiceCard name='الفيزا' countFieldName='visas' typeFieldName='visaProfitType' valueFieldName='visaProfitValue' borderColorClass="border-green-300" calculatedProfit={calculatedVisaProfit} currencySymbol={currencySymbol} />
                            <ServiceCard name='الفنادق' countFieldName='hotels' typeFieldName='hotelProfitType' valueFieldName='hotelProfitValue' borderColorClass="border-orange-300" calculatedProfit={calculatedHotelProfit} currencySymbol={currencySymbol} />
                            <ServiceCard name='الكروبات' countFieldName='groups' typeFieldName='groupProfitType' valueFieldName='groupProfitValue' borderColorClass="border-purple-300" calculatedProfit={calculatedGroupProfit} currencySymbol={currencySymbol} />
                        </div>
                    </div>
                    
                    {hasPartner && (
                        <div className="p-4 border rounded-lg space-y-3">
                            <h3 className="font-semibold text-base">توزيع حصص الشركاء</h3>
                            <div className="flex items-end gap-2 mb-2 p-2 rounded-lg bg-muted/50">
                                <div className="flex-grow space-y-1.5">
                                    <Label>الشريك</Label>
                                    <Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريك..."/>
                                </div>
                                <div className="w-24 space-y-1.5"><Label>النوع</Label><Select value={currentPartnerType} onValueChange={(v: any) => setCurrentPartnerType(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">مبلغ</SelectItem></SelectContent></Select></div>
                                <div className="w-28 space-y-1.5">
                                    <Label>القيمة</Label>
                                    <div className="relative">
                                        <Input type="text" inputMode="decimal" value={currentPartnerValue} onChange={(e) => setCurrentPartnerValue(Number(e.target.value))} placeholder="0.00" className="pe-7"/>
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">{currentPartnerType === 'percentage' ? '%' : '$'}</span>
                                    </div>
                                </div>
                                <div className="w-32 space-y-1.5"><Label>المبلغ المحسوب</Label><Input value={`${currentPartnerShareAmount.toFixed(2)} ${periodForm.getValues('currency')}`} readOnly disabled className="font-mono" /></div>
                                <Button type="button" size="icon" className="shrink-0" onClick={handleAddPartner} disabled={calculatedTotalProfit <= 0}><PlusCircle className="h-4 w-4"/></Button>
                            </div>
                            {fields.length > 0 && (
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded-md">
                                            <span className="font-semibold flex-grow">{watch(`partners.${index}.name`)}</span>
                                            <Badge variant="secondary">{watch(`partners.${index}.value`)} {watch(`partners.${index}.type`) === 'percentage' ? '%' : '$'}</Badge>
                                            <Badge className="font-mono">{watch(`partners.${index}.shareAmount`)?.toFixed(2)} {periodForm.getValues('currency')}</Badge>
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <Separator/>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="إجمالي الأرباح" value={calculatedTotalProfit} currency={periodForm.getValues('currency')} symbol={currencySymbol} className="border-blue-500/50" />
                        <StatCard title="إجمالي حصص الشركاء" value={totalPartnerShareAmount} currency={periodForm.getValues('currency')} symbol={currencySymbol} className="border-purple-500/50" />
                        <StatCard title="حصة الروضتين الصافية" value={alrawdatainShareAmount} currency={periodForm.getValues('currency')} symbol={currencySymbol} className="border-green-500/50" />
                    </div>
                    <div className='flex justify-end'>
                        <Button type="button" onClick={handleCompanyFormSubmit(onAddEntry)}>
                            <PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة
                        </Button>
                    </div>
                </div>
            </div>
        </FormProvider>
    );
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess, children }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<any[]>([]);
    const { data: navData, loaded: navDataLoaded, fetchData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    
    const periodForm = useForm<PeriodFormValues>({
        resolver: zodResolver(periodSchema),
    });

    const { control: periodControl, handleSubmit: handlePeriodSubmit, trigger: triggerPeriod, watch: watchPeriod, getValues } = periodForm;
    
    const { fields: companyFields, append, remove } = useFieldArray({ control: periodForm.control, name: "entries" });

    useEffect(() => {
        if (open) {
            periodForm.reset({
                fromDate: new Date(),
                toDate: new Date(),
                currency: navData?.settings?.currencySettings?.defaultCurrency || 'USD',
                entries: [],
            });
            setPeriodEntries([]);
        }
    }, [open, periodForm, navData]);

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        
        const getProfit = (count: number, type: 'percentage' | 'fixed', value: number) => 
            type === 'fixed' ? (count || 0) * value : 0;

        const ticketProfits = getProfit(data.tickets, data.ticketProfitType, data.ticketProfitValue);
        const visaProfits = getProfit(data.visas, data.visaProfitType, data.visaProfitValue);
        const hotelProfits = getProfit(data.hotels, data.hotelProfitType, data.hotelProfitValue);
        const groupProfits = getProfit(data.groups, data.groupProfitType, data.groupProfitValue);
        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        
        const partnerSharesValue = (data.partners || []).reduce((acc, p) => acc + (p.shareAmount || 0), 0);
        const alrawdatainShare = total - partnerSharesValue;

        const newEntry = {
            ...data,
            companyName: company?.name || '',
            ticketProfits,
            otherProfits,
            total,
            alrawdatainShare,
            partnerShare: partnerSharesValue,
        };
        append(newEntry as any);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
    };
    
    const removeEntry = (index: number) => remove(index);

    const handleSavePeriod = async (data: PeriodFormValues) => {
        if (!data.entries || data.entries.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }
        if (!currentUser || !('uid' in currentUser)) {
            toast({ title: 'خطأ', description: 'المستخدم غير معرف.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = data.entries.map((entry: any) => ({ ...entry, fromDate: format(data.fromDate!, 'yyyy-MM-dd'), toDate: format(data.toDate!, 'yyyy-MM-dd'), currency: data.currency }));
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
    
    const currencyOptions = navData?.settings?.currencySettings?.currencies || [{ code: 'USD', name: 'US Dollar', symbol: '$' }, { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' }];
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                </DialogHeader>
                <FormProvider {...periodForm}>
                    <form onSubmit={handlePeriodSubmit(handleSavePeriod)} className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                        <div className="p-4 border rounded-lg bg-background/50 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                             <FormField control={periodControl} name="fromDate" render={({ field }) => (
                                <FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <FormField control={periodControl} name="toDate" render={({ field }) => (
                                <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                             <FormField control={periodControl} name="currency" render={({ field }) => (
                                <FormItem><FormLabel>العملة</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>{currencyOptions.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <AddCompanyToSegmentForm allCompanyOptions={allCompanyOptions} partnerOptions={partnerOptions} onAddEntry={handleAddCompanyEntry} />
                        
                        <div className='p-4 border rounded-lg'>
                            <h3 className="font-semibold text-base mb-2">الشركات المضافة ({companyFields.length})</h3>
                             <div className='border rounded-lg overflow-hidden'>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="w-12"></TableHead><TableHead>الشركة</TableHead><TableHead>إجمالي الربح</TableHead><TableHead>حصة الروضتين</TableHead><TableHead>حصص الشركاء</TableHead><TableHead className='w-[60px] text-center'>حذف</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {companyFields.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                        ) : (
                                            companyFields.map((entry: any, index) => (
                                                <Collapsible asChild key={entry.id}>
                                                    <tbody className='border-t'>
                                                    <TableRow>
                                                        <TableCell><CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger></TableCell>
                                                        <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                                        <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                                        <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                                        <TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell>
                                                        <TableCell className='text-center'><Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button></TableCell>
                                                    </TableRow>
                                                    <CollapsibleContent asChild>
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="p-2 bg-muted/50">
                                                                <div className="p-2 space-y-2">
                                                                    <h5 className="font-semibold text-sm">تفاصيل الأرباح:</h5>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                                        <p>تذاكر: <strong>{entry.ticketProfits.toFixed(2)}</strong></p>
                                                                        <p>أخرى: <strong>{entry.otherProfits.toFixed(2)}</strong></p>
                                                                    </div>
                                                                    <h5 className="font-semibold text-sm pt-2 border-t mt-2">توزيع حصص الشركاء:</h5>
                                                                    {(entry.partners || []).length > 0 ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {entry.partners.map((share: any, i: number) => (
                                                                                <div key={i} className="flex justify-between items-center text-xs p-1 bg-background rounded">
                                                                                    <span>{share.name}</span>
                                                                                    <Badge className="font-mono">{share.shareAmount.toFixed(2)}</Badge>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : <p className="text-xs text-muted-foreground">لا يوجد شركاء لهذه الشركة.</p>}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    </CollapsibleContent>
                                                    </tbody>
                                                </Collapsible>
                                            ))
                                        )}
                                </TableBody>
                                </Table>
                            </div>
                        </div>
                    </form>
                </FormProvider>
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                     <Button type="button" onClick={handlePeriodSubmit(handleSavePeriod)} disabled={isSaving || companyFields.length === 0} className="w-full sm:w-auto">
                        {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ بيانات الفترة ({companyFields.length} سجلات)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

```