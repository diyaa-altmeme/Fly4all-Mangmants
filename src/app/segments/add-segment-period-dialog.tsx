
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSegmentEntries } from "@/app/segments/actions";
import {
  PlusCircle, Trash2, Percent, Loader2, Ticket, CreditCard, Hotel, Users as GroupsIcon, ArrowDown, ChevronsUpDown
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

const ProfitDetailRow = ({ icon, label, count, type, value, currencySymbol }: { icon: React.ReactNode, label: string, count: number, type: string, value: number, currencySymbol: string }) => {
  if (!count || count === 0) return null;
  const profit = computeService(count, type as any, value);
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-4 font-mono text-xs">
        <span>العدد: {count}</span>
        <span>العمولة: {value} {type === 'fixed' ? currencySymbol : '%'}</span>
        <span className="font-bold text-primary">الربح: {profit.toFixed(2)}</span>
      </div>
    </div>
  );
};

const SummaryList = ({ onRemove }: { onRemove: (index: number) => void }) => {
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
            <CardHeader className="p-3">
                <CardTitle className="text-base">الشركات المضافة للفترة</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
                {summaryEntries.map((entry, index) => (
                    <Collapsible key={entry.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center p-2 bg-muted/30">
                           <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronsUpDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle details</span>
                                </Button>
                            </CollapsibleTrigger>
                            <span className="font-bold flex-grow mx-2">{entry.clientName}</span>
                            <span className="font-mono text-lg font-bold text-blue-600">{entry.totalProfit.toFixed(2)} {currency.symbol}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive me-1" onClick={() => onRemove(index)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove item</span>
                            </Button>
                        </div>
                        <CollapsibleContent>
                            <div className="p-3 space-y-2 border-t">
                               {entry.notes && (
                                 <p className="text-sm text-muted-foreground pb-2 mb-2 border-b">
                                   <b>ملاحظة:</b> {entry.notes}
                                 </p>
                               )}
                               <ProfitDetailRow
                                 icon={<Ticket className="h-5 w-5 text-blue-500" />}
                                 label="تذاكر"
                                 count={entry.tickets}
                                 type={entry.ticketProfitType}
                                 value={entry.ticketProfitValue}
                                 currencySymbol={currency.symbol}
                               />
                               <ProfitDetailRow
                                 icon={<CreditCard className="h-5 w-5 text-orange-500" />}
                                 label="فيزا"
                                 count={entry.visas}
                                 type={entry.visaProfitType}
                                 value={entry.visaProfitValue}
                                 currencySymbol={currency.symbol}
                               />
                               <ProfitDetailRow
                                  icon={<Hotel className="h-5 w-5 text-purple-500" />}
                                  label="فنادق"
                                  count={entry.hotels}
                                  type={entry.hotelProfitType}
                                  value={entry.hotelProfitValue}
                                  currencySymbol={currency.symbol}
                               />
                               <ProfitDetailRow
                                  icon={<GroupsIcon className="h-5 w-5 text-teal-500" />}
                                  label="كروبات"
                                  count={entry.groups}
                                  type={entry.groupProfitType}
                                  value={entry.groupProfitValue}
                                  currencySymbol={currency.symbol}
                               />
                            </div>
                        </CollapsibleContent>
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
    const { data: navData } = useVoucherNav();
    const [open, setOpen] = useState(false);
    
    const periodMethods = useForm<PeriodFormValues>({ resolver: zodResolver(periodFormSchema), defaultValues: { fromDate: new Date(), toDate: new Date(), currency: "USD", hasPartner: false, alrawdatainSharePercentage: 100, partners: [], summaryEntries: [] } });
    const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = periodMethods;
    const { remove, append } = useFieldArray({ control, name: "summaryEntries" });

    const allCompanyOptions = useMemo(() => clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings })), [clients]);

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>{isEditing ? 'تعديل سجل سكمنت' : 'إضافة سجل سكمنت جديد'}</DialogTitle></DialogHeader>
                <FormProvider {...periodMethods}>
                    <form onSubmit={handleSubmit(finalOnSubmit)} className="flex-grow flex flex-col overflow-hidden">
                        <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-4 pb-4">
                            
                            <div className="p-3 border rounded-lg bg-background/50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                    <Controller control={control} name="fromDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>من تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                    <Controller control={control} name="toDate" render={({ field, fieldState }) => (<div className="space-y-1"><Label>إلى تاريخ</Label><DateTimePicker date={field.value} setDate={field.onChange} /><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                    <Controller control={control} name="currency" render={({ field, fieldState }) => (<div className="space-y-1"><Label>العملة</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{navData?.settings?.currencySettings?.currencies.map((c: any) => (<SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>))}</SelectContent></Select><p className='text-xs text-destructive h-3'>{fieldState.error?.message}</p></div>)} />
                                </div>
                                <Separator />
                                {/* Partner section can be added here if needed */}
                            </div>

                            <CompanyEntryForm onAdd={handleAddEntryToSummary} allCompanyOptions={allCompanyOptions} />

                            <SummaryList onRemove={remove} />
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

