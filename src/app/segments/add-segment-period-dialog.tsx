
"use client";

import React, { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { v4 as uuidv4 } from "uuid";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSegmentEntries } from "@/app/segments/actions";
import {
  PlusCircle, Trash2, Percent, Loader2, Ticket, CreditCard, Hotel, Users as GroupsIcon, ArrowDown, ChevronsUpDown, Save, Pencil, ArrowLeft, ArrowRight, X, Building, Store, Settings2, RotateCcw, Hash, User as UserIcon, CheckCircle, Wallet,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FormProvider, useForm, useFieldArray, Controller, useWatch, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { Client, Supplier, SegmentSettings, SegmentEntry, PartnerShareSetting, Currency } from '@/lib/types';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/lib/auth-context';


// Schemas
const companyEntrySchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  clientName: z.string().min(1),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

const partnerSchema = z.object({
    id: z.string(),
    partnerId: z.string().min(1, "اختر شريكاً."),
    partnerName: z.string(),
    percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا تتجاوز 100."),
    amount: z.coerce.number(), // This field is for calculation display, not direct input
});

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب" }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب" }),
  currency: z.string().min(1, "اختر العملة."),
  hasPartner: z.boolean().default(false),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(100),
  partners: z.array(partnerSchema).optional(),
  summaryEntries: z.array(z.any()).min(1, "يجب إضافة شركة واحدة على الأقل."),
});


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
export type PartnerShare = z.infer<typeof partnerSchema>;

// Helpers
function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeCompanyTotal(d: any, companySettings?: SegmentSettings) {
  if (!d) return 0;
  const settings = companySettings || {
    ticketProfitType: 'percentage', ticketProfitValue: 50,
    visaProfitType: 'percentage', visaProfitValue: 100,
    hotelProfitType: 'percentage', hotelProfitValue: 100,
    groupProfitType: 'percentage', groupProfitValue: 100,
    alrawdatainSharePercentage: 50,
  };
  const ticketProfits = computeService(d.tickets, settings.ticketProfitType, settings.ticketProfitValue);
  const visaProfits = computeService(d.visas, settings.visaProfitType, settings.visaProfitValue);
  const hotelProfits = computeService(d.hotels, settings.hotelProfitType, settings.hotelProfitValue);
  const groupProfits = computeService(d.groups, settings.groupProfitType, settings.groupProfitValue);
  const otherProfits = visaProfits + hotelProfits + groupProfits;
  return ticketProfits + otherProfits;
}

// Sub-components
const ServiceLine = ({ label, icon: Icon, color, countField, typeField, valueField }: any) => {
  const { control } = useFormContext<CompanyEntryFormValues>();
  const count = useWatch({ control, name: countField });
  const result = count || 0;

  return (
    <Card className={cn("shadow-sm overflow-hidden", color)}>
      <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 text-white">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</CardTitle>
        <div className="text-xs font-bold font-mono px-1.5 py-0.5 bg-background/20 rounded-md">{result}</div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-1">
        <Controller control={control} name={countField} render={({ field }) => (<div><Label className="sr-only">العدد</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="العدد" className="h-8 text-center font-semibold text-sm" /></div>)} />
      </CardContent>
    </Card>
  );
};

interface AddCompanyToSegmentFormProps {
    onAdd: (data: any) => void;
    allCompanyOptions: { value: string; label: string; settings?: SegmentSettings }[];
    partnerOptions: { value: string; label: string }[];
    editingEntry?: any;
    onCancelEdit: () => void;
}

const AddCompanyToSegmentForm = forwardRef(({ onAdd, allCompanyOptions, partnerOptions, editingEntry, onCancelEdit }: AddCompanyToSegmentFormProps, ref) => {
    const { getValues } = useFormContext<PeriodFormValues>();
    
    const form = useForm<CompanyEntryFormValues>({
        resolver: zodResolver(companyEntrySchema),
    });
    
    const { reset, control, handleSubmit, watch, setValue } = form;

    React.useEffect(() => {
        reset(editingEntry || { id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
    }, [editingEntry, reset]);

    useImperativeHandle(ref, () => ({ resetForm: () => reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" }) }), [reset]);

    const watchAll = watch();
    const currentClientId = watch('clientId');
    const selectedCompany = useMemo(() => allCompanyOptions.find(c => c.value === currentClientId), [allCompanyOptions, currentClientId]);
    
    const { hasPartner, alrawdatainSharePercentage } = getValues();
    const companySettings = useMemo(() => {
        const baseSettings = selectedCompany?.settings || {};
        return {
            ...baseSettings,
            alrawdatainSharePercentage: hasPartner ? alrawdatainSharePercentage : 100,
        };
    }, [selectedCompany, hasPartner, alrawdatainSharePercentage]);
    
    const { total, alrawdatainShare, partnerShare } = useMemo(() => {
        const totalProfit = computeCompanyTotal(watchAll, companySettings);
        const alrawdatainS = totalProfit * ((companySettings.alrawdatainSharePercentage || 100) / 100);
        return {
            total: totalProfit,
            alrawdatainShare: alrawdatainS,
            partnerShare: totalProfit - alrawdatainS,
        };
    }, [watchAll, companySettings]);


    const handleAddClick = (data: CompanyEntryFormValues) => {
        onAdd({ ...data, total: total, alrawdatainShare, partnerShare, companyName: selectedCompany?.label || '' });
        reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
        onCancelEdit();
    };


    return (
        <FormProvider {...form}>
            <div className="space-y-3">
                 <Card className="border rounded-lg shadow-sm border-primary/40">
                    <CardHeader className="p-2 flex flex-row items-center justify-between bg-muted/30">
                        <CardTitle className="text-base font-semibold">{editingEntry ? 'تعديل بيانات الشركة' : 'إدخال بيانات الشركة'}</CardTitle>
                        <div className='font-mono text-sm text-blue-600 font-bold'>ربح الشركة: {total.toFixed(2)}</div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3">
                        <Controller control={control} name="clientId" render={({ field, fieldState }) => (<div className="space-y-1"><Label>الشركة المصدرة للسكمنت</Label><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={v => field.onChange(v)} placeholder="ابحث/اختر..."/><p className="text-xs text-destructive h-3">{fieldState.error?.message}</p></div>)} />
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <ServiceLine label="تذاكر" icon={Ticket} color="bg-blue-600" countField="tickets" />
                            <ServiceLine label="فيزا" icon={CreditCard} color="bg-orange-500" countField="visas" />
                            <ServiceLine label="فنادق" icon={Hotel} color="bg-purple-500" countField="hotels" />
                            <ServiceLine label="كروبات" icon={GroupsIcon} color="bg-teal-500" countField="groups" />
                        </div>
                        <div className="flex justify-center pt-2">
                          <Button type="button" onClick={handleSubmit(handleAddClick)} className='w-full md:w-1/2'>
                              {editingEntry ? <Pencil className="me-2 h-4 w-4" /> : <ArrowDown className="me-2 h-4 w-4" />}
                              {editingEntry ? 'تحديث الشركة' : 'إضافة إلى الفترة'}
                          </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </FormProvider>
    );
});
AddCompanyToSegmentForm.displayName = "AddCompanyToSegmentForm";

const SummaryList = ({ onRemove, onEdit }: { onRemove: (index: number) => void, onEdit: (index: number) => void }) => {
    const { watch } = useFormContext<PeriodFormValues>();
    const { data: navData } = useVoucherNav();
    const summaryEntries = watch("summaryEntries");
    const currencyCode = watch("currency");
    
    const currency = useMemo(() => 
        navData?.settings?.currencySettings?.currencies.find((c: any) => c.code === currencyCode) || { symbol: '$', code: 'USD' }
    , [currencyCode, navData]);

    if (!summaryEntries || summaryEntries.length === 0) {
        return <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">لم يتم إضافة أي شركات إلى الفترة حتى الآن.</div>;
    }

    return (
        <Card>
            <CardHeader className="p-3"><CardTitle className="text-base">الشركات المضافة للفترة</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
                {summaryEntries.map((entry, index) => (
                    <Collapsible key={entry.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center p-2 bg-muted/30">
                           <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronsUpDown className="h-4 w-4" /><span className="sr-only">Toggle details</span></Button>
                            </CollapsibleTrigger>
                            <span className="font-bold flex-grow mx-2">{entry.companyName}</span>
                            <span className="font-mono text-lg font-bold text-blue-600">{entry.total.toFixed(2)} {currency.symbol}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onEdit(index)}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive me-1" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Remove item</span></Button>
                        </div>
                        <CollapsibleContent><div className="p-3 space-y-2 border-t">{/* Details here */}</div></CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    );
};

// Main Dialog Wrapper
interface AddSegmentPeriodDialogProps { clients: Client[]; suppliers: Supplier[]; onSuccess: () => Promise<void>; isEditing?: boolean; existingPeriod?: any; children?: React.ReactNode; }

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess, isEditing = false, existingPeriod, children }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const addCompanyFormRef = React.useRef<{ resetForm: () => void }>(null);
    const [editingEntry, setEditingEntry] = useState<any | null>(null);
    const { data: navData, fetchData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    
    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
    
    const [currentPartnerId, setCurrentPartnerId] = useState('');
    const [currentPercentage, setCurrentPercentage] = useState<number | string>('');
    const [editingPartnerIndex, setEditingPartnerIndex] = useState<number | null>(null);

    const periodForm = useForm<PeriodFormValues>({
        resolver: zodResolver(periodSchema),
    });
    
    const { control, handleSubmit: handlePeriodSubmit, watch, setValue, formState: { errors: periodErrors }, trigger, reset: resetForm, getValues } = periodForm;
    const { fields: summaryFields, append, remove, update } = useFieldArray({ control: periodForm.control, name: "summaryEntries" });
    const { fields: partnerFields, append: appendPartner, remove: removePartner, update: updatePartner } = useFieldArray({ control: periodForm.control, name: "partners" });
    
    const watchedPeriod = watch();
    const periodDataIsValid = watch('fromDate') && watch('toDate');

    useEffect(() => {
        if (open) {
            resetForm({
                fromDate: undefined, toDate: undefined, currency: 'USD', hasPartner: false,
                alrawdatainSharePercentage: 100, partners: [], summaryEntries: []
            });
            setEditingEntry(null);
        }
    }, [open, resetForm]);

    const { totalProfit, alrawdatainShareAmount, amountForPartners, totalPartnerPercentage, distributedToPartners, remainderForPartners } = useMemo(() => {
        const periodEntries = watchedPeriod.summaryEntries || [];
        const totalProfit = periodEntries.reduce((sum, e) => sum + (e.total || 0), 0);
        const alrawdatainPerc = Number(watchedPeriod.alrawdatainSharePercentage) || 100;
        const alrawdatainAmount = totalProfit * (alrawdatainPerc / 100);
        const availableForPartners = totalProfit - alrawdatainAmount;
        
        const partnerPerc = (watchedPeriod.partners || []).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
        const distributedAmount = availableForPartners * (partnerPerc / 100);
    
        return { 
            totalProfit,
            alrawdatainShareAmount: alrawdatainAmount,
            amountForPartners: availableForPartners, 
            totalPartnerPercentage: partnerPerc,
            distributedToPartners: distributedAmount,
            remainderForPartners: availableForPartners - distributedAmount,
        };
    }, [watchedPeriod.summaryEntries, watchedPeriod.alrawdatainSharePercentage, watchedPeriod.partners]);
    
    const partnerSharePreview = useMemo(() => {
        const value = Number(currentPercentage) || 0;
        return amountForPartners * (value / 100);
    }, [currentPercentage, amountForPartners]);

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

    const handleAddOrUpdateEntry = (entryData: any) => {
        if (editingEntry) {
            const index = summaryFields.findIndex(f => f.id === editingEntry.id);
            if (index > -1) update(index, { ...summaryFields[index], ...entryData, id: summaryFields[index].id });
            setEditingEntry(null);
        } else {
            append({ ...entryData, id: uuidv4() });
        }
        addCompanyFormRef.current?.resetForm();
    };

    const handleEditEntry = (index: number) => setEditingEntry(summaryFields[index]);

    const handleSavePeriod = async () => {
        const periodData = await trigger() ? getValues() : null;
        if (!periodData) {
            toast({ title: "الرجاء إكمال الحقول المطلوبة", variant: "destructive" });
            return;
        }

        if (summaryFields.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = summaryFields.map((entry: any) => ({
                ...entry,
                fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'),
                toDate: format(periodData.toDate!, 'yyyy-MM-dd'),
                currency: periodData.currency,
                hasPartner: periodData.hasPartner,
                alrawdatainSharePercentage: periodData.alrawdatainSharePercentage,
                partnerShares: (periodData.partners || []).map(p => ({
                    partnerId: p.partnerId,
                    partnerName: p.partnerName,
                    share: amountForPartners * (p.percentage / 100)
                }))
            }));
            
            const result = await addSegmentEntries(finalEntries, isEditing ? existingPeriod?.periodId : undefined);
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
    
    const handleAddOrUpdatePartner = () => {
        if(!currentPartnerId || !currentPercentage) {
            toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
            return;
        }
        const newPercentage = Number(currentPercentage);
        if (isNaN(newPercentage) || newPercentage <= 0) {
            toast({ title: "النسبة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
            return;
        }
        
        const currentPartners = getValues('partners') || [];
        
        const editingPartnerOldPercentage = editingPartnerIndex !== null ? currentPartners[editingPartnerIndex]?.percentage || 0 : 0;
        const currentTotalPartnerPercentage = currentPartners.reduce((sum, p) => sum + p.percentage, 0) - editingPartnerOldPercentage;
        const adjustedTotal = currentTotalPartnerPercentage + newPercentage;

        if (adjustedTotal > 100.01) {
             toast({ title: "لا يمكن تجاوز 100%", description: `إجمالي النسب الحالية: ${currentTotalPartnerPercentage.toFixed(2)}%`, variant: 'destructive' });
             return;
        }
    
        const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
        if(!selectedPartner) {
             toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
             return;
        }
    
        const partnerData = {
            id: editingPartnerIndex !== null ? partnerFields[editingPartnerIndex].id : `new-${Date.now()}`,
            partnerId: selectedPartner.value,
            partnerName: selectedPartner.label,
            percentage: newPercentage,
            amount: (amountForPartners * newPercentage) / 100
        };
    
        if (editingPartnerIndex !== null) {
          updatePartner(editingPartnerIndex, partnerData);
          setEditingPartnerIndex(null);
        } else {
          appendPartner(partnerData);
        }
        
        setCurrentPartnerId('');
        setCurrentPercentage('');
    };

    const handleEditPartner = (index: number) => {
        const partnerToEdit = partnerFields[index];
        setEditingPartnerIndex(index);
        setCurrentPartnerId(partnerToEdit.partnerId);
        setCurrentPercentage(partnerToEdit.percentage);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل سجل سكمنت' : 'إضافة سجل سكمنت جديد'}</DialogTitle>
                </DialogHeader>
                
                <FormProvider {...periodForm}>
                    <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6 pb-4">
                        <div className="p-3 border rounded-lg bg-background/50 space-y-3">
                            <h3 className="font-semibold text-base">البيانات الرئيسية للفترة</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <FormField control={periodForm.control} name="fromDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>من تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                <FormField control={periodForm.control} name="toDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>إلى تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                <FormField control={periodForm.control} name="currency" render={({ field, fieldState }) => (<div className="space-y-1"><Label>العملة</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{currencyOptions.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                            </div>
                              <div className="pt-4 border-t">
                                <FormField
                                    control={control}
                                    name="hasPartner"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel className="font-semibold">توزيع حصص الشركاء</FormLabel>
                                                 <FormDescription className="text-xs">
                                                    تفعيل هذا الخيار سيسمح لك بتوزيع حصة الشركاء من الأرباح.
                                                </FormDescription>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                {watchedPeriod.hasPartner && (
                                     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={control} name="alrawdatainSharePercentage" render={({ field }) => (<FormItem><FormLabel>حصة الروضتين (%)</FormLabel><div className="relative"><NumericInput value={field.value} onValueChange={v => field.onChange(v || 0)} className="pe-7 h-9" /><Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></FormItem>)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {periodDataIsValid && (
                             <AddCompanyToSegmentForm ref={addCompanyFormRef} onAdd={handleAddOrUpdateEntry} editingEntry={editingEntry} onCancelEdit={() => setEditingEntry(null)} allCompanyOptions={allCompanyOptions} partnerOptions={partnerOptions}/>
                        )}
                        
                        {periodDataIsValid && (
                            <SummaryList onRemove={remove} onEdit={handleEditEntry} />
                        )}
                    </div>
                
                    <DialogFooter className="pt-4 border-t flex-shrink-0">
                        <div className="flex justify-between w-full">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="button" onClick={handleSavePeriod} disabled={isSaving || summaryFields.length === 0} className="sm:w-auto">
                                {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                                حفظ بيانات الفترة ({summaryFields.length} سجلات)
                            </Button>
                        </div>
                    </DialogFooter>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
