
"use client";

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import { useForm, FormProvider, useFormContext, Controller, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSegmentEntries } from "@/app/segments/actions";
import { useAuth } from "@/lib/auth-context";

import { PlusCircle, Save, Trash2, Settings2, ChevronDown, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Hash, User as UserIcon, Wallet, Building, Briefcase, Ticket, CreditCard, Hotel, Users as GroupsIcon, Percent, Loader2, X } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ---------- Schemas ----------

const partnerSchema = z.object({
  id: z.string(),
  relationId: z.string().min(1, "اختر شريكاً من قائمة العلاقات."),
  relationName: z.string().min(1),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.coerce.number().min(0),
});

const companyEntrySchema = z.object({
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


  discountType: z.enum(["none", "fixed", "percentage"]).default("none"),
  discountValue: z.coerce.number().min(0).default(0),

  hasPartners: z.boolean().default(false),
  alrawdatainSharePct: z.coerce.number().min(0).max(100).default(100),
  partners: z.array(partnerSchema).default([]),
  notes: z.string().optional(),
}).refine(data => {
    if (!data.hasPartners) return true;
    const totals = computeTotals(data);
    return totals.partnersTotal <= totals.partnerPool + 0.01;
}, {
    message: "إجمالي حصص الشركاء يتجاوز المبلغ المتاح لهم.",
    path: ["partners"],
});

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.string().min(1, "اختر العملة."),
  entries: z.array(companyEntrySchema).default([]),
});


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

// ---------- Helpers ----------

function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeTotals(d: CompanyEntryFormValues) {
  const tType = d.ticketProfitType;
  const vType = d.visaProfitType;
  const hType = d.hotelProfitType;
  const gType = d.groupProfitType;

  const tVal = d.ticketProfitValue;
  const vVal = d.visaProfitValue;
  const hVal = d.hotelProfitValue;
  const gVal = d.groupProfitValue;

  const totalTickets = computeService(d.tickets, tType, tVal);
  const totalVisas   = computeService(d.visas,   vType, vVal);
  const totalHotels  = computeService(d.hotels,  hType, hVal);
  const totalGroups  = computeService(d.groups,  gType, gVal);

  const gross = totalTickets + totalVisas + totalHotels + totalGroups;

  const discountAmt =
    d.discountType === "fixed" ? d.discountValue :
    d.discountType === "percentage" ? (gross * d.discountValue) / 100 :
    0;

  const net = Math.max(0, gross - discountAmt);

  const rodatainShare = (net * (d.hasPartners ? d.alrawdatainSharePct : 100)) / 100;
  const partnerPool   = Math.max(0, net - rodatainShare);

  let percentSum = 0, fixedSum = 0;
  (d.partners || []).forEach(p => {
    if (p.type === "percentage") percentSum += p.value;
    else fixedSum += p.value;
  });

  const percentAllocation = partnerPool * Math.min(1, percentSum / 100);
  const fixedAllocation   = Math.min(Math.max(0, partnerPool - percentAllocation), fixedSum);
  const fixedScale        = fixedSum > 0 ? (fixedAllocation / fixedSum) : 0;

  const partnerBreakdown = (d.partners || []).map(p => ({
    ...p,
    share: p.type === "percentage" ? partnerPool * (p.value / 100) : p.value * fixedScale
  }));

  const partnersTotal = partnerBreakdown.reduce((s, p) => s + p.share, 0);
  const remainder = Math.max(0, partnerPool - partnersTotal);

  return {
    perService: { totalTickets, totalVisas, totalHotels, totalGroups },
    gross,
    discountAmt,
    net,
    rodatainShare,
    partnerPool,
    partnerBreakdown,
    partnersTotal,
    remainder,
  };
}

function useCurrencySymbol(currency?: string) {
  if (!currency) return "";
  if (currency === "IQD") return "ع.د";
  if (currency === "USD") return "$";
  if (currency === "SAR") return "﷼";
  if (currency === "AED") return "د.إ";
  return currency;
}

// ---------- Memory per client (localStorage) ----------

const MEM_NS = "segment:client-prefs:v1";
type ClientPrefs = Pick<
  CompanyEntryFormValues,
  | "ticketProfitType" | "ticketProfitValue"
  | "visaProfitType" | "visaProfitValue"
  | "hotelProfitType" | "hotelProfitValue"
  | "groupProfitType" | "groupProfitValue"
>;

function loadClientPrefs(userId: string | null, clientId: string | null): ClientPrefs | null {
  if (typeof window === "undefined" || !userId || !clientId) return null;
  const raw = localStorage.getItem(`${MEM_NS}:${userId}:${clientId}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as ClientPrefs; } catch { return null; }
}

function saveClientPrefs(userId: string | null, clientId: string | null, prefs: ClientPrefs) {
  if (typeof window === "undefined" || !userId || !clientId) return;
  localStorage.setItem(`${MEM_NS}:${userId}:${clientId}`, JSON.stringify(prefs));
}

// ---------- Reusable fields ----------

const ServiceLine = React.forwardRef(function ServiceLine({
  label,
  icon: Icon,
  color,
  countField,
  typeField,
  valueField,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  countField: keyof CompanyEntryFormValues;
  typeField: keyof CompanyEntryFormValues;
  valueField: keyof CompanyEntryFormValues;
}, ref: React.ForwardedRef<HTMLDivElement>) {
  const { control } = useFormContext<CompanyEntryFormValues>();

  const count = Number(useWatch({ name: countField as any }) || 0);
  const type = (useWatch({ name: typeField as any }) as "fixed" | "percentage") || "fixed";
  const val  = Number(useWatch({ name: valueField as any }) || 0);

  const result = useMemo(() => computeService(count, type, val), [count, type, val]);
  const currencySymbol = useCurrencySymbol(useFormContext<PeriodFormValues>().getValues('currency'));

  return (
    <Card className={cn("shadow-sm overflow-hidden", color)} ref={ref}>
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 text-white">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {label}
        </CardTitle>
        <div className="text-sm font-bold font-mono px-2 py-1 bg-background/20 rounded-md">
          {result.toFixed(2)} {currencySymbol}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-2 bg-background">
        <Controller
          control={control}
          name={countField as any}
          render={({ field }) => (
            <div className="space-y-1">
              <Label className="text-xs">العدد</Label>
              <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} className="h-9 text-center font-semibold text-base" />
            </div>
          )}
        />
        <div className="grid grid-cols-1 gap-2">
             <div className="space-y-1">
              <Label className="text-xs">قيمة العمولة</Label>
              <Controller
                control={control}
                name={valueField as any}
                render={({ field }) => (
                  <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} className="h-8 text-xs" />
                )}
              />
            </div>
        </div>
      </CardContent>
    </Card>
  );
});


// ---------- AddCompanyToSegmentForm ----------

const AddCompanyToSegmentForm = forwardRef(function AddCompanyToSegmentForm(
  { onAddEntry }: { onAddEntry: (data: any) => void },
  ref
) {
  const { data: navData } = useVoucherNav();
  const { user } = useAuth() || {};
  const parent = useFormContext<PeriodFormValues>();
  
    const relationOptions = useMemo(() => {
    if (!navData) return [];
    return [...(navData.clients || []), ...(navData.suppliers || [])]
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i) // Ensure uniqueness
      .map((r) => ({ value: r.id, label: r.name }));
  }, [navData]);

  const companyOptions = (navData?.clients || []).map((c: any) => ({ value: c.id, label: c.name }));

  const form = useForm<CompanyEntryFormValues>({
    resolver: zodResolver(companyEntrySchema),
    defaultValues: {
      clientId: "", clientName: "",
      tickets: 0, visas: 0, hotels: 0, groups: 0,
      ticketProfitType: "fixed", ticketProfitValue: 1,
      visaProfitType: "fixed", visaProfitValue: 1,
      hotelProfitType: "fixed", hotelProfitValue: 1,
      groupProfitType: "fixed", groupProfitValue: 1,
      discountType: "none", discountValue: 0,
      hasPartners: false,
      alrawdatainSharePct: 100,
      partners: [],
    },
  });

  useImperativeHandle(ref, () => ({ resetForm: () => form.reset() }), [form]);

  const watchAll = useWatch({ control: form.control });
  const totals = useMemo(() => computeTotals(form.getValues()), [watchAll, form]);

  const currentClientId = useWatch({ control: form.control, name: "clientId" }) as string;
  useEffect(() => {
    if (!currentClientId) return;
    const clientSettings = navData?.clients?.find(c => c.id === currentClientId)?.segmentSettings;
    if (clientSettings) {
        form.setValue("ticketProfitType", clientSettings.ticketProfitType);
        form.setValue("ticketProfitValue", clientSettings.ticketProfitValue);
        form.setValue("visaProfitType", clientSettings.visaProfitType);
        form.setValue("visaProfitValue", clientSettings.visaProfitValue);
        form.setValue("hotelProfitType", clientSettings.hotelProfitType);
        form.setValue("hotelProfitValue", clientSettings.hotelProfitValue);
        form.setValue("groupProfitType", clientSettings.groupProfitType);
        form.setValue("groupProfitValue", clientSettings.groupProfitValue);
        form.setValue("alrawdatainSharePct", clientSettings.alrawdatainSharePercentage);
    }
  }, [currentClientId, form, user?.uid, navData?.clients]);

  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
    control: form.control,
    name: "partners",
  });
  
    const handleAddPartner = () => appendPartner({ id: uuidv4(), relationId: "", relationName: "", type: "percentage", value: 0 });
    const currencySymbol = useCurrencySymbol(parent.getValues("currency"));

    const onAdd = (data: CompanyEntryFormValues) => {
        const client = navData?.clients.find(c => c.id === data.clientId);
        if (client && client.segmentSettings) {
            saveClientPrefs(user?.uid ?? null, data.clientId, client.segmentSettings);
        }

        const computed = computeTotals(data);

        onAddEntry({
        ...data,
        computed,
        });

        form.reset({
        ...form.getValues(),
        tickets: 0, visas: 0, hotels: 0, groups: 0,
        partners: [],
        hasPartners: false,
        alrawdatainSharePct: 100,
        discountType: "none",
        discountValue: 0,
        notes: '',
        });
    };

    const setAllProfitTypes = (type: "fixed" | "percentage") => {
        form.setValue("ticketProfitType", type);
        form.setValue("visaProfitType", type);
        form.setValue("hotelProfitType", type);
        form.setValue("groupProfitType", type);
    };

    const currencyOptions = navData?.settings?.currencySettings?.currencies || [];


  return (
    <FormProvider {...form}>
      <Card className="border rounded-lg">
        <CardHeader className="py-3">
          <CardTitle className="text-base">الشركة والخدمات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid md:grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <div className="space-y-1">
                  <Label>الشركة المصدّرة للسكمنت</Label>
                  <Autocomplete
                    options={companyOptions}
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const found = companyOptions.find((o) => o.value === v);
                      form.setValue("clientName", found?.label || "");
                    }}
                    placeholder="ابحث/اختر شركة..."
                  />
                </div>
              )}
            />
            <div className="space-y-1">
              <Label>ملاحظة (اختياري)</Label>
              <Input placeholder="وصف مختصر لهذا الإدخال" {...form.register('notes')} />
            </div>
          </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ServiceLine label="التذاكر" icon={Ticket} color="bg-blue-600" countField="tickets" typeField="ticketProfitType" valueField="ticketProfitValue" />
              <ServiceLine label="الفيزا" icon={CreditCard} color="bg-orange-500" countField="visas" typeField="visaProfitType" valueField="visaProfitValue" />
              <ServiceLine label="الفنادق" icon={Hotel} color="bg-purple-500" countField="hotels" typeField="hotelProfitType" valueField="hotelProfitValue" />
              <ServiceLine label="الكروبات" icon={GroupsIcon} color="bg-teal-500" countField="groups" typeField="groupProfitType" valueField="groupProfitValue" />
          </div>


          <Collapsible>
            <CollapsibleTrigger asChild>
                 <div className="flex items-center justify-between">
                    <Controller
                        control={form.control}
                        name="hasPartners"
                        render={({ field }) => (
                            <div className="flex items-center gap-2">
                            <Switch checked={field.value} onCheckedChange={field.onChange} id="has-partners-switch" />
                            <Label htmlFor="has-partners-switch" className="font-semibold">توزيع حصص الشركاء</Label>
                            </div>
                        )}
                    />
                    <Button type="button" variant="ghost" size="sm" className="gap-1 -mr-2">
                      <Settings2 className="h-4 w-4" />
                      الإعدادات المالية
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3 space-y-3">
                 <div className="flex items-center justify-between mt-3 rounded-md border p-2">
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <Label>نوع العمولة (عام)</Label>
                            <Select onValueChange={(v: "fixed" | "percentage") => setAllProfitTypes(v)} defaultValue="fixed">
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                    <SelectItem value="percentage">نسبة %</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-1">
                            <Label>العملة</Label>
                            <Select
                                value={parent.watch('currency')}
                                onValueChange={(v) => parent.setValue('currency', v)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {currencyOptions.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
          </Collapsible>
          
          <Separator />

          <Collapsible open={form.getValues('hasPartners')}>
            <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                    <Controller
                    control={form.control}
                    name="alrawdatainSharePct"
                    render={({ field }) => (
                        <div className="space-y-1">
                        <Label>حصة الروضتين (%)</Label>
                        <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} />
                        <p className="text-xs text-muted-foreground">إذا لا يوجد شركاء، اجعلها 100%.</p>
                        </div>
                    )}
                    />
                    <div className="md:col-span-2 flex items-end justify-end"><Button type="button" variant="outline" onClick={handleAddPartner}><PlusCircle className="h-4 w-4 me-2" />إضافة شريك</Button></div>
                </div>
                {partnerFields.length > 0 && <div className="space-y-2">{partnerFields.map((pf, idx) => (<div key={pf.id} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2"><div className="col-span-5"><Label>الشريك (من العلاقات)</Label><Controller control={form.control} name={`partners.${idx}.relationId` as const} render={({ field }) => (<Autocomplete searchAction="all" options={relationOptions} value={field.value} onValueChange={(v) => { field.onChange(v); const rel = relationOptions.find((r) => r.value === v); form.setValue(`partners.${idx}.relationName` as const, rel?.label || "");}} placeholder="اختر شريكاً" />)}/></div><div className="col-span-2"><Label>النوع</Label><Controller control={form.control} name={`partners.${idx}.type` as const} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">ثابت</SelectItem></SelectContent></Select>)}/></div><div className="col-span-3"><Label>القيمة</Label><Controller control={form.control} name={`partners.${idx}.value` as const} render={({ field }) => (<NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} />)}/></div><div className="col-span-2 flex items-center justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removePartner(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>))}</div>}
            </CollapsibleContent>
          </Collapsible>
          
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="bg-muted/40 border-none">
              <CardHeader className="py-2"><CardTitle className="text-sm">تفصيل الخدمات</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>الإجمالي</span><span className="font-mono">{totals.gross.toFixed(2)} {currencySymbol}</span></div>
                <div className="flex justify-between"><span>الخصم</span><span className="font-mono">{totals.discountAmt.toFixed(2)} {currencySymbol}</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold"><span>الصافي</span><span className="font-mono">{totals.net.toFixed(2)} {currencySymbol}</span></div>
              </CardContent>
            </Card>

            <Card className="bg-muted/40 border-none">
              <CardHeader className="py-2"><CardTitle className="text-sm">توزيع الأرباح</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>حصة الروضتين</span><span className="font-mono">{totals.rodatainShare.toFixed(2)} {currencySymbol}</span></div>
                <div className="flex justify-between"><span>المتاح للشركاء</span><span className="font-mono">{totals.partnerPool.toFixed(2)} {currencySymbol}</span></div>
                {totals.partnerBreakdown.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    {totals.partnerBreakdown.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="truncate">{p.relationName || `شريك #${i+1}`}</span>
                        <Badge variant="secondary" className="font-mono">{p.share.toFixed(2)} {currencySymbol}</Badge>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold"><span>مجموع الشركاء</span><span className="font-mono">{totals.partnersTotal.toFixed(2)} {currencySymbol}</span></div>
                    {totals.remainder > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>المتبقي غير موزّع</span><span className="font-mono">{totals.remainder.toFixed(2)} {currencySymbol}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={form.handleSubmit(onAdd)} className="mt-1">
              <PlusCircle className="me-2 h-4 w-4" />
              إضافة للفترة
            </Button>
          </div>
        </CardContent>
      </Card>
    </FormProvider>
  );
});

// ---------- Wrapper: AddSegmentPeriodDialog ----------

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();
  const { user } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  
  const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
  const companyForm = useForm<CompanyEntryFormValues>({ resolver: zodResolver(companyEntrySchema) });

  const { control, getValues, reset } = periodForm;
  const { fields, append, remove } = useFieldArray({ control, name: "entries" as const });
  
  const currencyList =
    (navData?.settings?.currencySettings?.currencies || [{ code: "USD", name: "USD" }, { code: "IQD", name: "IQD" }, { code: "SAR", name: "SAR" }])
      .map((c: any) => ({ value: c.code, label: c.name }));

  const addEntry = (entry: any) => {
    append(entry);
    toast({ title: "تمت إضافة الشركة إلى الفترة." });
  };
  
  const removeEntry = (index: number) => {
    remove(index);
  }

  const goToNextStep = async () => {
    const isValid = await periodForm.trigger();
    if (isValid) {
        setStep(2);
    }
  };

  const handleSavePeriod = async () => {
    const periodData = getValues();
    if (fields.length === 0) {
      toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    
    const finalEntries = fields.map((entry: any) => ({
      ...entry,
      fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'),
      toDate: format(periodData.toDate!, 'yyyy-MM-dd'),
      currency: periodData.currency,
      alrawdatainShare: entry.computed.rodatainShare,
      partnerShare: entry.computed.partnersTotal,
      total: entry.computed.net,
      ticketProfits: entry.computed.perService.totalTickets,
      otherProfits: entry.computed.perService.totalVisas + entry.computed.perService.totalHotels + entry.computed.perService.totalGroups,
      partnerShares: entry.computed.partnerBreakdown.map((p: any) => ({ partnerId: p.relationId, partnerName: p.relationName, share: p.share })),
    }));
    
    try {
      const res = await addSegmentEntries(finalEntries as any);
      if (!res?.success) throw new Error(res?.error || "فشل الحفظ");
      toast({ title: "تم حفظ بيانات الفترة بنجاح" });
      reset({ fromDate: periodData.fromDate, toDate: periodData.toDate, currency: periodData.currency, entries: [] });
      await onSuccess();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e?.message || "حصل خطأ غير متوقع", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
          <DialogDescription>
             {step === 1 
                ? "الخطوة 1 من 2: حدد الفترة المحاسبية للسجل."
                : "الخطوة 2 من 2: أضف بيانات الشركات لهذه الفترة."}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...periodForm}>
          <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
            {step === 1 && (
              <div className="p-4 border rounded-lg bg-background/50">
                <Form {...periodForm}>
                  <form className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <FormField control={periodForm.control} name="fromDate" render={({ field }) => (
                      <FormItem><FormLabel>من تاريخ</FormLabel><Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { if(d) field.onChange(d); setIsFromCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                    <FormField control={periodForm.control} name="toDate" render={({ field }) => (
                      <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { if(d) field.onChange(d); setIsToCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                    )}/>
                     <FormField control={periodForm.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>العملة</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {currencyList.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              </div>
            )}
            
            {step === 2 && (
              <>
                <AddCompanyToSegmentForm onAddEntry={addEntry} />
                <Card className="border rounded-lg">
                  <CardHeader className="py-3"><CardTitle className="text-base">الشركات المضافة ({fields.length})</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>الشريك</TableHead><TableHead>الإجمالي</TableHead><TableHead>حصة الروضتين</TableHead><TableHead>حصة الشريك</TableHead><TableHead className="w-[60px] text-center">حذف</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {fields.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-20">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                          ) : fields.map((f: any, i: number) => {
                            const sym = useCurrencySymbol(getValues("currency"));
                            return (
                              <TableRow key={f.id}>
                                <TableCell className="font-medium">{f.clientName || f.clientId}</TableCell>
                                <TableCell>{f.computed?.partnerBreakdown?.map((p:any) => p.relationName).join(', ')}</TableCell>
                                <TableCell className="font-mono">{f.computed?.net?.toFixed(2)} {sym}</TableCell>
                                <TableCell className="font-mono text-green-600">{f.computed?.rodatainShare?.toFixed(2)} {sym}</TableCell>
                                <TableCell className="font-mono text-blue-600">{f.computed?.partnersTotal?.toFixed(2)} {sym}</TableCell>
                                <TableCell className='text-center'>
                                  <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(i)}><Trash2 className='h-4 w-4'/></Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </FormProvider>

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
                <ArrowRight className="me-2 h-4 w-4" />
                رجوع
              </Button>
              <Button type="button" onClick={handleSavePeriod} disabled={isSaving || fields.length === 0} className="sm:w-auto">
                {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                حفظ بيانات الفترة ({fields.length} سجلات)
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    