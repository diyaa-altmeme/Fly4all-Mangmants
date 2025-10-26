
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSegmentEntries } from "@/app/segments/actions";
import {
  PlusCircle, Trash2, Percent, Loader2, X, Ticket, CreditCard, Hotel, Users as GroupsIcon, ArrowDown, ChevronsUpDown, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { FormProvider, useForm, useFieldArray, useWatch, Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Client, Supplier } from '@/lib/types';
import { DateTimePicker } from '@/components/ui/datetime-picker';

// Schemas
const companyEntrySchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  clientName: z.string().min(1),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  ticketProfitType: z.enum(["fixed", "percentage"]).default("fixed"),
  ticketProfitValue: z.coerce.number().min(0).default(1),
  visaProfitType: z.enum(["fixed", "percentage"]).default("fixed"),
  visaProfitValue: z.coerce.number().min(0).default(1),
  hotelProfitType: z.enum(["fixed", "percentage"]).default("fixed"),
  hotelProfitValue: z.coerce.number().min(0).default(1),
  groupProfitType: z.enum(["fixed", "percentage"]).default("fixed"),
  groupProfitValue: z.coerce.number().min(0).default(1),
  notes: z.string().optional(),
});

const partnerSchema = z.object({
  id: z.string(),
  partnerId: z.string().min(1, "اختر شريكاً."),
  partnerName: z.string().min(1),
  percentage: z.coerce.number().min(0).max(100),
  amount: z.coerce.number(),
});

const periodFormSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.string().min(1, "اختر العملة."),
  hasPartner: z.boolean().default(false),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(100),
  partners: z.array(partnerSchema).default([]),
  summaryEntries: z.array(z.any()).min(1, "يجب إضافة شركة واحدة على الأقل."),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodFormSchema>;

// Helpers
function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeCompanyTotal(d: any) {
  if (!d) return 0;
  return [
    computeService(d.tickets, d.ticketProfitType, d.ticketProfitValue),
    computeService(d.visas, d.visaProfitType, d.visaProfitValue),
    computeService(d.hotels, d.hotelProfitType, d.hotelProfitValue),
    computeService(d.groups, d.groupProfitType, d.groupProfitValue)
  ].reduce((sum, val) => sum + val, 0);
}

// UI Components
const ServiceLine = ({ label, icon: Icon, color, countField, typeField, valueField }: any) => {
  const { control, watch } = useFormContext();
  const [count, type, val] = watch([countField, typeField, valueField]);
  const result = useMemo(() => computeService(count, type, val), [count, type, val]);

  return (
    <Card className={cn("shadow-sm overflow-hidden", color)}>
      <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 text-white">
        <CardTitle className="text-xs font-bold flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</CardTitle>
        <div className="text-xs font-bold font-mono px-1.5 py-0.5 bg-background/20 rounded-md">{result.toFixed(2)}</div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-1">
        <Controller control={control} name={countField} render={({ field }) => (<div><Label className="sr-only">العدد</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="العدد" className="h-8 text-center font-semibold text-sm" /></div>)} />
        <div className="grid grid-cols-2 gap-1">
          <Controller control={control} name={typeField} render={({ field }) => (<div><Label className="sr-only">النوع</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">مبلغ</SelectItem><SelectItem value="percentage">نسبة</SelectItem></SelectContent></Select></div>)} />
          <Controller control={control} name={valueField} render={({ field }) => (<div><Label className="sr-only">العمولة</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="العمولة" className="h-7 text-xs" /></div>)} />
        </div>
      </CardContent>
    </Card>
  );
};

const PartnerSection = ({ partnerOptions }: { partnerOptions: { value: string; label: string }[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { control, watch } = useFormContext<PeriodFormValues>();
  const { fields: partnerFields, append, remove } = useFieldArray({ control, name: "partners" });
  
  const [summaryEntries, alrawdatainSharePercentage, partners] = watch(["summaryEntries", "alrawdatainSharePercentage", "partners"]);

  const { totalNetProfit, rodatainShare, partnerPool, partnerBreakdown, remainder } = useMemo(() => {
    const totalProfit = summaryEntries.reduce((sum: number, entry: any) => sum + (entry.totalProfit || 0), 0);
    const rodatainShare = (totalProfit * alrawdatainSharePercentage) / 100;
    const partnerPool = Math.max(0, totalProfit - rodatainShare);
    const partnerBreakdown = partners.map(p => ({ ...p, share: partnerPool * (p.percentage / 100) }));
    const partnersTotal = partnerBreakdown.reduce((s, p) => s + p.share, 0);
    return { totalNetProfit: totalProfit, rodatainShare, partnerPool, partnerBreakdown, remainder: partnerPool - partnersTotal };
  }, [summaryEntries, alrawdatainSharePercentage, partners]);

  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const [currentPartnerPercentage, setCurrentPartnerPercentage] = useState<number | string>('');
  const partnerSharePreview = useMemo(() => partnerPool * (Number(currentPartnerPercentage) / 100), [currentPartnerPercentage, partnerPool]);
  
  const handleAddPartner = () => {
    if (!currentPartnerId || !currentPartnerPercentage) return;
    const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
    if (!selectedPartner) return;
    append({ id: uuidv4(), partnerId: selectedPartner.value, partnerName: selectedPartner.label, percentage: Number(currentPartnerPercentage), amount: 0 });
    setCurrentPartnerId('');
    setCurrentPartnerPercentage('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex justify-between items-center p-2 h-auto">
          <span className="font-semibold">تفاصيل توزيع الأرباح</span>
          <ChevronsUpDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
              <div className="font-semibold text-blue-600 text-xs p-2 bg-blue-50 dark:bg-blue-950/50 rounded-md">إجمالي الربح<span className="block text-sm font-mono">{totalNetProfit.toFixed(2)}</span></div>
              <div className="space-y-1"><Label className="text-xs">حصة الروضتين (%)</Label><div className="relative"><Controller name="alrawdatainSharePercentage" control={control} render={({ field }) => (<NumericInput {...field} onValueChange={v => field.onChange(v || 0)} className="h-9 pe-7"/>)} /><Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></div>
              <div className="font-semibold text-green-600 text-xs p-2 bg-green-50 dark:bg-green-950/50 rounded-md">حصة الروضتين<span className="block text-sm font-mono">{rodatainShare.toFixed(2)}</span></div>
              <div className="font-semibold text-purple-600 text-xs p-2 bg-purple-50 dark:bg-purple-950/50 rounded-md">متاح للشركاء<span className="block text-sm font-mono">{partnerPool.toFixed(2)}</span></div>
              <div className={cn("font-semibold text-xs p-2 rounded-md", Math.abs(remainder) > 0.01 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600")}>المتبقي<span className="block text-sm font-mono">{remainder.toFixed(2)}</span></div>
          </div>
          <Separator />
          <div className="mt-2"><h4 className="font-semibold text-sm mb-1">إضافة شريك</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end p-2 rounded-lg bg-muted/50"><div className="space-y-1"><Label className="text-xs">الشريك</Label><Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريكًا..."/></div><div className="w-40 space-y-1"><Label className="text-xs">النسبة (%)</Label><div className="relative"><NumericInput value={currentPartnerPercentage} onValueChange={setCurrentPartnerPercentage} className="h-9 pe-7" /><Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></div><div className="flex items-end gap-2"><div className="flex-grow"><Label className="text-xs">الحصة</Label><div className="h-9 flex items-center justify-center font-bold text-blue-600 font-mono p-2 bg-blue-50 rounded-md">{partnerSharePreview.toFixed(2)}</div></div><Button type="button" size="icon" className="shrink-0 h-9 w-9" onClick={handleAddPartner} disabled={partnerPool <= 0 || !currentPartnerId || !currentPartnerPercentage}><PlusCircle className="h-5 w-5"/></Button></div></div></div>
          {partnerFields.length > 0 && <div className="mt-2"><h4 className="font-semibold text-sm mb-1">الشركاء المضافون</h4><div className="border rounded-md"><Table><TableBody>{partnerFields.map((field, index) => { const computedPartner = partnerBreakdown.find(p => p.id === field.id); return (<TableRow key={field.id}><TableCell className="font-semibold p-2 text-sm">{computedPartner?.partnerName}</TableCell><TableCell className="p-2 text-sm">{field.percentage}%</TableCell><TableCell className="font-mono font-bold p-2 text-blue-600">{computedPartner?.share.toFixed(2)}</TableCell><TableCell className="p-1 text-center"><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>) })}</TableBody></Table></div></div>}
      </CollapsibleContent>
    </Collapsible>
  );
};

const CompanyEntryForm = ({ onAdd, allCompanyOptions }: { onAdd: (data: any) => void, allCompanyOptions: any[] }) => {
    const entryMethods = useForm<CompanyEntryFormValues>({ resolver: zodResolver(companyEntrySchema), defaultValues: { id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, ticketProfitType: "fixed", ticketProfitValue: 1, visaProfitType: "fixed", visaProfitValue: 1, hotelProfitType: "fixed", hotelProfitValue: 1, groupProfitType: "fixed", groupProfitValue: 1, notes: "" } });
    const { control, handleSubmit, reset, watch, setValue } = entryMethods;
    const watchEntry = watch();
    const companyTotal = useMemo(() => computeCompanyTotal(watchEntry), [watchEntry]);
    const currentClientId = watch(`clientId`);

    useEffect(() => {
        if (!currentClientId) return;
        const client = allCompanyOptions.find(c => c.value === currentClientId);
        if (client?.settings) { Object.keys(client.settings).forEach(key => setValue(key as any, client.settings[key])); }
    }, [currentClientId, setValue, allCompanyOptions]);

    const handleAddClick = (data: CompanyEntryFormValues) => {
        onAdd({ ...data, totalProfit: computeCompanyTotal(data) });
        reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, ticketProfitType: "fixed", ticketProfitValue: 1, visaProfitType: "fixed", visaProfitValue: 1, hotelProfitType: "fixed", hotelProfitValue: 1, groupProfitType: "fixed", groupProfitValue: 1, notes: "" });
    };

    return (
        <FormProvider {...entryMethods}>
            <Card className="border rounded-lg shadow-sm border-primary/40">
                <CardHeader className="p-2 flex flex-row items-center justify-between bg-muted/30"><CardTitle className="text-base font-semibold">إدخال بيانات الشركة</CardTitle><div className='font-mono text-sm text-blue-600 font-bold'>ربح الشركة: {companyTotal.toFixed(2)}</div></CardHeader>
                <CardContent className="space-y-3 p-3">
                    <div className="grid md:grid-cols-2 gap-3">
                        <Controller control={control} name="clientId" render={({ field, fieldState }) => (<div className="space-y-1"><Label>الشركة المصدرة</Label><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={v => { field.onChange(v); setValue(`clientName`, allCompanyOptions.find(o => o.value === v)?.label || ""); }} placeholder="ابحث/اختر..."/><p className="text-xs text-destructive h-3">{fieldState.error?.message}</p></div>)} />
                        <Controller control={control} name="notes" render={({ field }) => (<div className="space-y-1"><Label>ملاحظة</Label><Input {...field} placeholder="وصف مختصر (اختياري)" /><p className="h-3"></p></div>)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><ServiceLine label="تذاكر" icon={Ticket} color="bg-blue-600" countField="tickets" typeField="ticketProfitType" valueField="ticketProfitValue" /><ServiceLine label="فيزا" icon={CreditCard} color="bg-orange-500" countField="visas" typeField="visaProfitType" valueField="visaProfitValue" /><ServiceLine label="فنادق" icon={Hotel} color="bg-purple-500" countField="hotels" typeField="hotelProfitType" valueField="hotelProfitValue" /><ServiceLine label="كروبات" icon={GroupsIcon} color="bg-teal-500" countField="groups" typeField="groupProfitType" valueField="groupProfitValue" /></div>
                    <div className="flex justify-center pt-2"><Button type="button" onClick={handleSubmit(handleAddClick)} className='w-full md:w-1/2'><ArrowDown className="me-2 h-4 w-4" /> إضافة إلى الفترة</Button></div>
                </CardContent>
            </Card>
        </FormProvider>
    );
}

const SummaryEntryDetailRow = ({ label, count, type, value }: { label: string, count: number, type: string, value: number }) => {
  if (!count) return null;
  const profit = computeService(count, type as any, value);
  return (
    <div className="flex justify-between items-center text-xs p-1.5 bg-background rounded-md">
      <span className="font-semibold text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-3 font-mono">
        <span>العدد: {count}</span>
        <span>العمولة: {value} ({type === 'fixed' ? 'مبلغ' : '%'})</span>
        <span className="font-bold text-primary">الربح: {profit.toFixed(2)}</span>
      </div>
    </div>
  );
};

const SummaryTableRow = ({ entry, index, onRemove }: { entry: any, index: number, onRemove: (index: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TableRow className={cn(isOpen && "bg-muted/50")} key={entry.id}>
        <TableCell className="font-semibold">{entry.clientName}</TableCell>
        <TableCell className="font-mono font-bold text-blue-600">{entry.totalProfit.toFixed(2)}</TableCell>
        <TableCell className="text-left p-1">
          <div className="flex items-center">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}><ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} /></Button>
          </div>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={3} className="p-2 bg-muted/50">
            <div className="space-y-1 p-2 border rounded-md">
                {entry.notes && <p className="text-xs text-gray-600 dark:text-gray-300 pb-1 mb-1 border-b"><b>ملاحظة:</b> {entry.notes}</p>}
                <SummaryEntryDetailRow label="التذاكر" count={entry.tickets} type={entry.ticketProfitType} value={entry.ticketProfitValue} />
                <SummaryEntryDetailRow label="الفيزا" count={entry.visas} type={entry.visaProfitType} value={entry.visaProfitValue} />
                <SummaryEntryDetailRow label="الفنادق" count={entry.hotels} type={entry.hotelProfitType} value={entry.hotelProfitValue} />
                <SummaryEntryDetailRow label="الكروبات" count={entry.groups} type={entry.groupProfitType} value={entry.groupProfitValue} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const SummaryTable = ({ onRemove }: { onRemove: (index: number) => void }) => {
    const { watch } = useFormContext<PeriodFormValues>();
    const summaryEntries = watch("summaryEntries");

    if (!summaryEntries || summaryEntries.length === 0) {
        return <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">لم يتم إضافة أي شركات إلى الفترة حتى الآن.</div>;
    }

    return (
        <Card>
            <CardHeader className="p-3"><CardTitle className="text-base">الشركات المضافة للفترة</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="text-sm">
                        <TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>إجمالي الربح</TableHead><TableHead className="w-[100px] text-left">إجراءات</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {summaryEntries.map((entry, index) => <SummaryTableRow key={entry.id} entry={entry} index={index} onRemove={onRemove} /> )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// Main Dialog Wrapper
interface AddSegmentPeriodDialogProps { clients: Client[]; suppliers: Supplier[]; onSuccess: () => Promise<void>; isEditing?: boolean; existingPeriod?: any; children?: React.ReactNode; }

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess, isEditing = false, existingPeriod, children }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const { data: navData } = useVoucherNav();
    const [open, setOpen] = useState(false);
    
    const periodMethods = useForm<PeriodFormValues>({ resolver: zodResolver(periodFormSchema), defaultValues: { fromDate: new Date(), toDate: new Date(), currency: "USD", hasPartner: false, alrawdatainSharePercentage: 100, partners: [], summaryEntries: [] } });
    const { control, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = periodMethods;
    const { fields, append, remove } = useFieldArray({ control, name: "summaryEntries" });

    const allCompanyOptions = useMemo(() => clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings })), [clients]);
    const partnerOptions = useMemo(() => [...clients, ...suppliers].map(r => ({ value: r.id, label: `${r.relationType === 'client' ? 'عميل: ' : r.relationType === 'supplier' ? 'مورد: ' : ''}${r.name}` })), [clients, suppliers]);

    useEffect(() => {
        if (open) {
            const defaultCurrency = navData?.settings?.currencySettings?.defaultCurrency || "USD";
            reset({ fromDate: new Date(), toDate: new Date(), currency: defaultCurrency, hasPartner: false, alrawdatainSharePercentage: 100, partners: [], summaryEntries: [] });
        }
    }, [open, reset, navData]);

    const handleAddEntryToSummary = useCallback((entryData: any) => {
        append(entryData);
        toast({ title: "تمت إضافة الشركة", description: `${entryData.clientName} | الربح: ${entryData.totalProfit.toFixed(2)}` });
    }, [append, toast]);

    const finalOnSubmit = async (data: PeriodFormValues) => {
        try {
            const totalPeriodProfit = data.summaryEntries.reduce((sum, e) => sum + e.totalProfit, 0);
            const partnerPool = totalPeriodProfit * (1 - data.alrawdatainSharePercentage / 100);

            const finalEntries = data.summaryEntries.map(entry => ({
                ...entry,
                fromDate: format(data.fromDate, 'yyyy-MM-dd'), toDate: format(data.toDate, 'yyyy-MM-dd'), currency: data.currency,
                hasPartner: data.hasPartner, alrawdatainSharePercentage: data.alrawdatainSharePercentage,
                partners: data.partners.map(p => ({ ...p, amount: partnerPool * (p.percentage / 100) })),
                total: entry.totalProfit,
            }));
            
            const result = await addSegmentEntries(finalEntries as any, isEditing ? existingPeriod?.periodId : undefined);
            if (!result.success) throw new Error(result.error);
            toast({ title: `تم حفظ الفترة بنجاح` });
            setOpen(false);
            await onSuccess();
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message || "لم يتم حفظ البيانات.", variant: "destructive" });
        }
    };
    
    const watchHasPartner = watch("hasPartner");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>{isEditing ? 'تعديل سجل سكمنت' : 'إضافة سجل سكمنت جديد'}</DialogTitle></DialogHeader>
                <FormProvider {...periodMethods}>
                    <form onSubmit={handleSubmit(finalOnSubmit)} className="flex-grow flex flex-col overflow-hidden">
                        <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-3 pb-4">
                            <div className="p-3 border rounded-lg bg-background/50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                    <Controller control={control} name="fromDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>من تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                    <Controller control={control} name="toDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>إلى تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                    <Controller control={control} name="currency" render={({ field, fieldState }) => (<div className="space-y-1"><Label>العملة</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{navData?.settings?.currencySettings?.currencies.map((c: any) => (<SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>))}</SelectContent></Select><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                </div>
                                <Separator />
                                <Controller control={control} name="hasPartner" render={({ field }) => (<div className="flex items-center gap-2"><Switch checked={field.value} onCheckedChange={field.onChange} id="has-partners-global" /><Label htmlFor="has-partners-global" className="font-semibold text-base">توزيع الأرباح على الشركاء</Label></div>)} />
                                {watchHasPartner && <PartnerSection partnerOptions={partnerOptions} />}
                            </div>

                            <CompanyEntryForm onAdd={handleAddEntryToSummary} allCompanyOptions={allCompanyOptions} />

                            <SummaryTable onRemove={remove} />
                            {errors.summaryEntries && <p className='text-sm text-destructive text-center'>{errors.summaryEntries.root?.message || errors.summaryEntries.message}</p>}

                        </div>
                        
                        <div className="pt-4 border-t flex-shrink-0 flex justify-between items-center">
                            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={isSubmitting} className="sm:w-auto">
                                {isSubmitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'حفظ التعديلات' : `حفظ الفترة بالكامل`}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
