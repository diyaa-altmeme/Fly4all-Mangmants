
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
import { Calendar } from '@/components/ui/calendar';


const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.enum(['USD', 'IQD']).default('USD'),
  entries: z.array(z.any()).min(1, "يجب إضافة شركة واحدة على الأقل."),
});

const partnerSchema = z.object({
  partnerId: z.string().min(1, "اسم الشريك مطلوب."),
  partnerName: z.string(),
  shareType: z.enum(['percentage', 'fixed']),
  shareValue: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
  notes: z.string().optional(),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  hasPartner: z.boolean().default(false),
  partners: z.array(partnerSchema).optional(),
  distributionType: z.enum(['percentage', 'fixed']).default('percentage'),
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
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(50),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface AddSegmentPeriodDialogProps {
  onSuccess: () => Promise<void>;
  children: React.ReactNode;
}

const ServiceCard = ({ name, countFieldName, typeFieldName, valueFieldName }: {
    name: string,
    countFieldName: `tickets` | `visas` | `hotels` | `groups`,
    typeFieldName: `ticketProfitType` | `visaProfitType` | `hotelProfitType` | `groupProfitType`,
    valueFieldName: `ticketProfitValue` | `visaProfitValue` | `hotelProfitValue` | `groupProfitValue`
}) => {
    const { control, watch } = useFormContext<CompanyEntryFormValues>();
    const count = watch(countFieldName) as number;
    const type = watch(typeFieldName);
    const value = watch(valueFieldName) as number;
    
    let result = 0;
    if (type === 'percentage') {
        result = (count || 0) * (value / 100);
    } else {
        result = (count || 0) * value;
    }
    
    const cardBorderColors: Record<string, string> = {
        'التذاكر': 'border-blue-400',
        'الفيزا': 'border-green-400',
        'الفنادق': 'border-orange-400',
        'الكروبات': 'border-purple-400',
    }

    return (
        <div className={cn("p-3 border-2 rounded-lg space-y-2", cardBorderColors[name])}>
            <p className="text-center font-bold">{name}</p>
             <FormField control={control} name={countFieldName} render={({ field }) => (<FormItem><FormControl><Input type="text" inputMode="decimal" placeholder="العدد" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} className="text-center font-bold text-lg h-10" /></FormControl></FormItem>)} />
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <span className="font-mono text-green-600 text-sm flex-grow">usd {result.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">الناتج</span>
            </div>
            <CollapsibleContent>
                 <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                     <Controller
                        name={typeFieldName}
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-20 h-8 text-xs px-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">%</SelectItem>
                                    <SelectItem value="fixed">$</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                     />
                     <Controller
                        name={valueFieldName}
                        control={control}
                        render={({ field }) => (
                             <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} className="h-8"/>
                        )}
                     />
                </div>
            </CollapsibleContent>
        </div>
    )
}

function AddCompanyToSegmentForm({ allCompanyOptions, partnerOptions, onAddEntry }: { allCompanyOptions: any[], partnerOptions: any[], onAddEntry: (data: CompanyEntryFormValues) => void }) {
    const { control, watch, setValue, handleSubmit: handleCompanyFormSubmit, reset: resetCompanyForm } = useFormContext<CompanyEntryFormValues>();
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

    const handleAddPartner = () => {
        if(!currentPartnerId || currentPartnerValue === '') {
            toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
            return;
        }
        const newValue = Number(currentPartnerValue);
        if (isNaN(newValue) || newValue <= 0) {
            toast({ title: "القيمة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
            return;
        }

        const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
        if(!selectedPartner) {
           toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
           return;
        }
        
        const newPartner: PartnerFormValues = { partnerId: selectedPartner.value, partnerName: selectedPartner.label, shareType: currentPartnerType, shareValue: newValue };
        append(newPartner as any);
        setCurrentPartnerId('');
        setCurrentPartnerValue('');
    };

    return (
        <div className="space-y-4">
             <FormField control={control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>
            )} />
            
             <Collapsible>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ServiceCard name='التذاكر' countFieldName='tickets' typeFieldName='ticketProfitType' valueFieldName='ticketProfitValue' />
                    <ServiceCard name='الفيزا' countFieldName='visas' typeFieldName='visaProfitType' valueFieldName='visaProfitValue' />
                    <ServiceCard name='الفنادق' countFieldName='hotels' typeFieldName='hotelProfitType' valueFieldName='hotelProfitValue' />
                    <ServiceCard name='الكروبات' countFieldName='groups' typeFieldName='groupProfitType' valueFieldName='groupProfitValue' />
                </div>
                <div className="flex items-end gap-4 p-4 mt-4 border rounded-lg bg-muted/50">
                    <CollapsibleTrigger asChild>
                         <Button type="button" variant="outline"><Settings2 className="me-2 h-4 w-4"/>الإعدادات المالية</Button>
                    </CollapsibleTrigger>
                     <div className="space-y-1.5 w-48">
                        <Label>نوع العمولة للكل</Label>
                        <Select onValueChange={v => {
                            setValue('ticketProfitType', v as 'fixed' | 'percentage');
                            setValue('visaProfitType', v as 'fixed' | 'percentage');
                            setValue('hotelProfitType', v as 'fixed' | 'percentage');
                            setValue('groupProfitType', v as 'fixed' | 'percentage');
                        }}>
                            <SelectTrigger><SelectValue placeholder="اختر..."/></SelectTrigger>
                            <SelectContent><SelectItem value="percentage">نسبة مئوية (%)</SelectItem><SelectItem value="fixed">مبلغ ثابت ($)</SelectItem></SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1.5 flex-grow">
                        <Label>نسبة الأرباح لنا (%)</Label>
                         <Controller
                            name="alrawdatainSharePercentage"
                            control={control}
                            render={({ field }) => (
                                 <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="50"/>
                            )}
                         />
                     </div>
                </div>
            </Collapsible>
            
             <div className="pt-2">
                <FormField control={control} name="hasPartner" render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                         <FormLabel className="font-semibold">هل يوجد شركاء في توزيع أرباح هذه الشركة؟</FormLabel>
                    </FormItem>
                )} />
            </div>
            {hasPartner && (
                <div className="p-3 border rounded-md bg-muted/50 space-y-3">
                    <h4 className="font-semibold text-sm">توزيع حصص الشركاء</h4>
                    <div className="flex items-end gap-2 mb-2 p-2 rounded-lg bg-background">
                        <div className="flex-grow space-y-1.5">
                            <Label>الشريك</Label>
                            <Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريك..."/>
                        </div>
                        <div className="w-24 space-y-1.5">
                            <Label>النوع</Label>
                            <Select value={currentPartnerType} onValueChange={(v: any) => setCurrentPartnerType(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">مبلغ</SelectItem></SelectContent></Select>
                        </div>
                        <div className="w-28 space-y-1.5">
                            <Label>القيمة</Label>
                            <Input type="number" value={currentPartnerValue} onChange={(e) => setCurrentPartnerValue(Number(e.target.value))} />
                        </div>
                        <Button type="button" size="icon" className="shrink-0" onClick={handleAddPartner}><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                     {fields.length > 0 && (
                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded-md">
                                    <span className="font-semibold flex-grow">{watch(`partners.${index}.partnerName`)}</span>
                                    <Badge variant="secondary">{watch(`partners.${index}.shareValue`)} {watch(`partners.${index}.shareType`) === 'percentage' ? '%' : '$'}</Badge>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            )}
             <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className='flex justify-end'>
                 <Button type="button" onClick={handleCompanyFormSubmit(onAddEntry)}>
                    <PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة
                 </Button>
            </div>
        </div>
    );
}

export default function AddSegmentPeriodDialog({ onSuccess, children }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    
    const [periodEntries, setPeriodEntries] = useState<any[]>([]);

    const periodForm = useForm<PeriodFormValues>({
        resolver: zodResolver(periodSchema),
    });

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
            notes: '',
            ticketProfitType: 'percentage',
            ticketProfitValue: 50,
            visaProfitType: 'percentage',
            visaProfitValue: 100,
            hotelProfitType: 'percentage',
            hotelProfitValue: 100,
            groupProfitType: 'percentage',
            groupProfitValue: 100,
            alrawdatainSharePercentage: 50
        }
    });

    const { control: periodControl, handleSubmit: handlePeriodSubmit, trigger: triggerPeriod } = periodForm;

    const { fields: companyFields, append, remove } = useFieldArray({ control: periodForm.control, name: "entries" });

    useEffect(() => {
        if (open) {
            periodForm.reset({
                fromDate: new Date(),
                toDate: new Date(),
                currency: 'USD',
                entries: [],
            });
            companyForm.reset();
            setPeriodEntries([]);
        }
    }, [open, periodForm, companyForm]);

    const allCompanyOptions = useMemo(() => (navData?.clients || []).filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings })), [navData?.clients]);
    const partnerOptions = useMemo(() => {
        const allRelations = [...(navData?.clients || []), ...(navData?.suppliers || [])];
        const uniqueRelations = Array.from(new Map(allRelations.map(item => [item.id, item])).values());
        return uniqueRelations.map(r => {
            let labelPrefix = '';
            if (r.relationType === 'client') labelPrefix = 'عميل: ';
            else if (r.relationType === 'supplier') labelPrefix = 'مورد: ';
            else if (r.relationType === 'both') labelPrefix = 'عميل ومورد: ';
            return { value: r.id, label: `${labelPrefix}${r.name}` };
        });
    }, [navData?.clients, navData?.suppliers]);

     const calculateShares = useCallback((data: CompanyEntryFormValues) => {
        const company = allCompanyOptions.find(c => c.value === data.clientId);
        const settings = company?.settings || data;

        const getProfit = (count: number, type: 'percentage' | 'fixed', value: number) => (type === 'percentage') ? (count || 0) * (value / 100) : (count || 0) * value;
        const ticketProfits = getProfit(data.tickets, settings.ticketProfitType, settings.ticketProfitValue);
        const otherProfits = getProfit(data.visas, settings.visaProfitType, settings.visaProfitValue) + getProfit(data.hotels, settings.hotelProfitType, settings.hotelProfitValue) + getProfit(data.groups, settings.groupProfitType, settings.groupProfitValue);
        const total = ticketProfits + otherProfits;
        
        let alrawdatainShare = total;
        let partnerTotalShare = 0;
        const partnerSharesDetails: { partnerId: string; partnerName: string; share: number }[] = [];

        if (data.hasPartner && data.partners && data.partners.length > 0) {
            if (data.distributionType === 'percentage') {
                const alrawdatainPercentage = data.alrawdatainSharePercentage !== undefined ? data.alrawdatainSharePercentage : 50;
                alrawdatainShare = total * (alrawdatainPercentage / 100);
                const remainingForPartners = total - alrawdatainShare;
                
                const totalPartnerPercentage = data.partners.reduce((sum, p) => sum + p.shareValue, 0);
                if (totalPartnerPercentage > 0) { // Avoid division by zero
                    data.partners.forEach(p => {
                        const amount = remainingForPartners * (p.shareValue / totalPartnerPercentage);
                        partnerSharesDetails.push({ partnerId: p.partnerId, partnerName: p.partnerName, share: amount });
                        partnerTotalShare += amount;
                    });
                }
            } else { // fixed
                const totalFixedPartnerShare = data.partners.reduce((sum, p) => sum + p.shareValue, 0);
                if (totalFixedPartnerShare > total) {
                    toast({ title: 'خطأ في التوزيع', description: 'مجموع الحصص الثابتة للشركاء أكبر من إجمالي الربح.', variant: 'destructive'});
                }
                alrawdatainShare = total - totalFixedPartnerShare;
                partnerTotalShare = totalFixedPartnerShare;
                data.partners.forEach(p => {
                     partnerSharesDetails.push({ partnerId: p.partnerId, partnerName: p.partnerName, share: p.shareValue });
                });
            }
        }

        return { ...data, companyName: company?.label || '', ticketProfits, otherProfits, total, alrawdatainShare, partnerShare: partnerTotalShare, partnerShares: partnerSharesDetails };
    }, [allCompanyOptions, toast]);


    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const newEntry = calculateShares(data);
        append(newEntry as any);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset();
    };
    
    const removeEntry = (index: number) => remove(index);

    const handleSavePeriod = async (data: PeriodFormValues) => {
        if (data.entries.length === 0) {
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
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>أدخل بيانات الفترة المحاسبية، ثم أضف سجلات الشركات.</DialogDescription>
                </DialogHeader>
                <FormProvider {...periodForm}>
                    <form onSubmit={periodForm.handleSubmit(handleSavePeriod)} className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                        <div className="p-4 border rounded-lg bg-background/50 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <FormField control={periodControl} name="fromDate" render={({ field }) => <FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                            <FormField control={periodControl} name="toDate" render={({ field }) => <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold text-base mb-2">إضافة شركة جديدة</h3>
                            <FormProvider {...companyForm}>
                               <AddCompanyToSegmentForm allCompanyOptions={allCompanyOptions} partnerOptions={partnerOptions} onAddEntry={handleAddCompanyEntry} />
                            </FormProvider>
                        </div>
                        
                        <div className='p-4 border rounded-lg'>
                            <h3 className="font-semibold text-base mb-2">الشركات المضافة ({companyFields.length})</h3>
                            <div className='border rounded-lg overflow-hidden'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الشركة</TableHead>
                                            <TableHead>إجمالي الربح</TableHead>
                                            <TableHead>حصة الروضتين</TableHead>
                                            <TableHead>حصص الشركاء</TableHead>
                                            <TableHead className='w-[60px] text-center'>حذف</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companyFields.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                        ) : companyFields.map((entry, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-semibold">{periodForm.watch(`entries.${index}.companyName`)}</TableCell>
                                                <TableCell className="font-mono">{periodForm.watch(`entries.${index}.total`)?.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{periodForm.watch(`entries.${index}.alrawdatainShare`)?.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-blue-600">{periodForm.watch(`entries.${index}.partnerShare`)?.toFixed(2)}</TableCell>
                                                <TableCell className='text-center'>
                                                    <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </form>
                </FormProvider>
                 <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <Button type="submit" onClick={periodForm.handleSubmit(handleSavePeriod)} disabled={isSaving || companyFields.length === 0} className="w-full sm:w-auto">
                        {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ بيانات الفترة ({companyFields.length} سجلات)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
