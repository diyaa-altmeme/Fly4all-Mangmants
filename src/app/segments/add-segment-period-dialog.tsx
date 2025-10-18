
"use client";

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { useForm, FormProvider, useFormContext, Controller, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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

import { PlusCircle, Save, Trash2, Settings2, ChevronDown, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Hash, User as UserIcon, Wallet, Building, Briefcase, Ticket, CreditCard, Hotel, Users as GroupsIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// ---------- Schemas ----------

const partnerSchema = z.object({
  relationId: z.string().min(1, "اختر شريكاً من قائمة العلاقات."),
  relationName: z.string().min(1),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.coerce.number().min(0),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, "اختر الشركة المصدّرة للسيجمنت."),
  clientName: z.string().min(1),

  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),

  unifiedType: z.enum(["fixed", "percentage"]).default("fixed"),
  unifiedValue: z.coerce.number().min(0).default(1),
  perServiceOverride: z.boolean().default(false),

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
  alrawdatainSharePct: z.coerce.number().min(0).max(100).default(100), // إذا لا يوجد شركاء = 100% للروضتين
  partners: z.array(partnerSchema).default([]),
});

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.string().min(1, "اختر العملة."),
  entries: z.array(z.any()).default([]),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;

// ---------- Helpers ----------

function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeTotals(d: CompanyEntryFormValues) {
  const tType = d.perServiceOverride ? d.ticketProfitType : d.unifiedType;
  const vType = d.perServiceOverride ? d.visaProfitType : d.unifiedType;
  const hType = d.perServiceOverride ? d.hotelProfitType : d.unifiedType;
  const gType = d.perServiceOverride ? d.groupProfitType : d.unifiedType;

  const tVal = d.perServiceOverride ? d.ticketProfitValue : d.unifiedValue;
  const vVal = d.perServiceOverride ? d.visaProfitValue : d.unifiedValue;
  const hVal = d.perServiceOverride ? d.hotelProfitValue : d.unifiedValue;
  const gVal = d.perServiceOverride ? d.groupProfitValue : d.unifiedValue;

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

  // توزيع الشركاء
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
  | "unifiedType" | "unifiedValue" | "perServiceOverride"
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

function ServiceLine({
  label,
  countField,
  typeField,
  valueField,
  icon: Icon,
  color,
}: {
  label: string;
  countField: keyof CompanyEntryFormValues;
  typeField: keyof CompanyEntryFormValues;
  valueField: keyof CompanyEntryFormValues;
  icon: React.ElementType;
  color: string;
}) {
  const { control } = useFormContext<CompanyEntryFormValues>();
  const perServiceOverride = useWatch({ name: "perServiceOverride" }) as boolean;

  const count = Number(useWatch({ name: countField as any }) || 0);
  const uType = (useWatch({ name: "unifiedType" }) as "fixed" | "percentage") || "fixed";
  const uVal  = Number(useWatch({ name: "unifiedValue" }) || 0);
  const oType = (useWatch({ name: typeField as any }) as "fixed" | "percentage") || "fixed";
  const oVal  = Number(useWatch({ name: valueField as any }) || 0);
  
  const currencySymbol = useCurrencySymbol(useFormContext<PeriodFormValues>().getValues('currency'));

  const type = perServiceOverride ? oType : uType;
  const val  = perServiceOverride ? oVal  : uVal;
  const result = useMemo(() => computeService(count, type, val), [count, type, val]);

  return (
    <Card className="shadow-sm overflow-hidden">
        <CardHeader className={cn("p-3 flex flex-row items-center justify-between space-y-0", color)}>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-white"><Icon className="h-5 w-5"/>{label}</CardTitle>
            <div className="text-sm font-bold font-mono px-2 py-1 bg-background/20 rounded-md text-white">
                {result.toFixed(2)} {currencySymbol}
            </div>
        </CardHeader>
        <CardContent className="p-3 pt-2 space-y-2">
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
            {perServiceOverride && (
                <div className="flex items-end gap-2">
                    <Controller
                        control={control}
                        name={valueField as any}
                        render={({ field }) => (
                            <div className="flex-grow space-y-1">
                                <Label className="text-xs">القيمة</Label>
                                <NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} className="h-8 text-xs" />
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name={typeField as any}
                        render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-xs">النوع</Label>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="النوع" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">ثابت</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    />
                </div>
            )}
        </CardContent>
    </Card>
  );
}

// ---------- AddCompanyToSegmentForm ----------

const AddCompanyToSegmentForm = forwardRef(function AddCompanyToSegmentForm(
  { onAddEntry }: { onAddEntry: (data: any) => void },
  ref
) {
  const { data: navData } = useVoucherNav();
  const { user } = useAuth() || {};
  const parent = useFormContext<PeriodFormValues>();
  const currencySymbol = useCurrencySymbol(parent.getValues("currency"));


  // علاقات (العملاء + المورّدين) باسم فقط
  const relationOptions =
    [
      ...(navData?.clients || []).map((r: any) => ({ id: r.id, name: r.name })),
      ...(navData?.suppliers || []).map((r: any) => ({ id: r.id, name: r.name })),
    ]
      // إزالة التكرار حسب id
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
      .map((r) => ({ value: r.id, label: r.name })) || [];

  const companyOptions = (navData?.clients || []).map((c: any) => ({ value: c.id, label: c.name }));

  const form = useForm<CompanyEntryFormValues>({
    resolver: zodResolver(companyEntrySchema),
    defaultValues: {
      clientId: "",
      clientName: "",
      tickets: 0, visas: 0, hotels: 0, groups: 0,
      unifiedType: "fixed",
      unifiedValue: 1,
      perServiceOverride: false,
      ticketProfitType: "fixed", ticketProfitValue: 1,
      visaProfitType: "fixed",   visaProfitValue: 1,
      hotelProfitType: "fixed",  hotelProfitValue: 1,
      groupProfitType: "fixed",  groupProfitValue: 1,
      discountType: "none",
      discountValue: 0,
      hasPartners: false,
      alrawdatainSharePct: 100,
      partners: [],
    },
  });

  useImperativeHandle(ref, () => ({ resetForm: () => form.reset() }), [form]);

  const watchAll = useWatch({ control: form.control });
  const totals = useMemo(() => computeTotals(form.getValues()), [watchAll]); 

  // تحميل تفضيلات الشركة من الذاكرة عند اختيار الشركة
  const currentClientId = useWatch({ control: form.control, name: "clientId" }) as string;
  useEffect(() => {
    if (!currentClientId) return;
    const prefs = loadClientPrefs(user?.uid ?? null, currentClientId);
    if (prefs) {
      form.reset({
          ...form.getValues(),
          unifiedType: prefs.unifiedType,
          unifiedValue: prefs.unifiedValue,
          perServiceOverride: prefs.perServiceOverride,
          ticketProfitType: prefs.ticketProfitType,
          ticketProfitValue: prefs.ticketProfitValue,
          visaProfitType: prefs.visaProfitType,
          visaProfitValue: prefs.visaProfitValue,
          hotelProfitType: prefs.hotelProfitType,
          hotelProfitValue: prefs.hotelProfitValue,
          groupProfitType: prefs.groupProfitType,
          groupProfitValue: prefs.groupProfitValue,
      });
    }
  }, [currentClientId, form, user?.uid]);

  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
    control: form.control,
    name: "partners",
  });
  
  const handleAddPartner = () => {
    appendPartner({ relationId: "", relationName: "", type: "percentage", value: 0 });
  };

  const onAdd = (data: CompanyEntryFormValues) => {
    saveClientPrefs(user?.uid ?? null, data.clientId, {
      unifiedType: data.unifiedType,
      unifiedValue: data.unifiedValue,
      perServiceOverride: data.perServiceOverride,
      ticketProfitType: data.ticketProfitType,
      ticketProfitValue: data.ticketProfitValue,
      visaProfitType: data.visaProfitType,
      visaProfitValue: data.visaProfitValue,
      hotelProfitType: data.hotelProfitType,
      hotelProfitValue: data.hotelProfitValue,
      groupProfitType: data.groupProfitType,
      groupProfitValue: data.groupProfitValue,
    });
    const computed = computeTotals(data);
    onAddEntry({ ...data, computed });
    form.reset({
      ...form.getValues(),
      tickets: 0, visas: 0, hotels: 0, groups: 0,
      partners: [], hasPartners: false, alrawdatainSharePct: 100,
      discountType: "none", discountValue: 0,
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onAdd)}>
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
                    <Label>الشركة المصدّرة</Label>
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
                <Input placeholder="وصف مختصر لهذا الإدخال" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ServiceLine label="التذاكر" icon={Ticket} color="bg-blue-600" countField="tickets" typeField="ticketProfitType" valueField="ticketProfitValue" />
                <ServiceLine label="الفيزا" icon={CreditCard} color="bg-orange-500" countField="visas" typeField="visaProfitType" valueField="visaProfitValue" />
                <ServiceLine label="الفنادق" icon={Hotel} color="bg-purple-500" countField="hotels" typeField="hotelProfitType" valueField="hotelProfitValue" />
                <ServiceLine label="الكروبات" icon={GroupsIcon} color="bg-teal-500" countField="groups" typeField="groupProfitType" valueField="groupProfitValue" />
            </div>
            
            <Collapsible>
              <div className="flex items-center justify-between">
                <Label className="font-semibold">الإعدادات المالية المتقدمة</Label>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1">
                    <Settings2 className="h-4 w-4" />
                    إظهار/إخفاء
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-3">
                <div className="grid md:grid-cols-4 gap-3">
                  <Controller control={form.control} name="unifiedType" render={({ field }) => ( <div className="space-y-1"><Label>نوع العمولة (عام)</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">ثابت</SelectItem><SelectItem value="percentage">%</SelectItem></SelectContent></Select></div> )}/>
                  <Controller control={form.control} name="unifiedValue" render={({ field }) => ( <div className="space-y-1"><Label>قيمة العمولة</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} /></div> )}/>
                  <Controller control={form.control} name="discountType" render={({ field }) => ( <div className="space-y-1"><Label>نوع الخصم</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">بدون</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem><SelectItem value="percentage">نسبة %</SelectItem></SelectContent></Select></div> )}/>
                  <Controller control={form.control} name="discountValue" render={({ field }) => ( <div className="space-y-1"><Label>قيمة الخصم</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} /></div> )}/>
                </div>
                <div className="flex items-center justify-between mt-3 rounded-md border p-2">
                  <div className="space-y-1"><Label>تفعيل قيم مخصصة لكل خدمة</Label><p className="text-xs text-muted-foreground">في حال تفعيلها، يمكنك ضبط نوع/قيمة العمولة لكل خدمة.</p></div>
                  <Controller control={form.control} name="perServiceOverride" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)}/>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <Collapsible defaultOpen={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Controller control={form.control} name="hasPartners" render={({ field }) => (<div className="flex items-center gap-2"><Switch checked={field.value} onCheckedChange={field.onChange} /><Label>تفعيل وجود شركاء</Label></div>)}/>
                </div>
                <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="gap-1">إدارة الشركاء<ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger>
              </div>

              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <Controller control={form.control} name="alrawdatainSharePct" render={({ field }) => (<div className="space-y-1"><Label>حصة الروضتين (%)</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} /><p className="text-xs text-muted-foreground">إذا لا يوجد شركاء، اجعلها 100%.</p></div>)}/>
                  <div className="md:col-span-2 flex items-end justify-end"><Button type="button" variant="outline" onClick={handleAddPartner}><PlusCircle className="h-4 w-4 me-2" />إضافة شريك</Button></div>
                </div>
                {partnerFields.length > 0 && <div className="space-y-2">{partnerFields.map((pf, idx) => (<div key={pf.id} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2"><div className="col-span-5"><Label>الشريك (من العلاقات)</Label><Controller control={form.control} name={`partners.${idx}.relationId` as const} render={({ field }) => (<Select value={field.value} onValueChange={(v) => { field.onChange(v); const rel = relationOptions.find((r) => r.value === v); form.setValue(`partners.${idx}.relationName` as const, rel?.label || "");}}><SelectTrigger><SelectValue placeholder="اختر شريكاً" /></SelectTrigger><SelectContent>{relationOptions.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent></Select>)}/></div><div className="col-span-2"><Label>النوع</Label><Controller control={form.control} name={`partners.${idx}.type` as const} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">ثابت</SelectItem></SelectContent></Select>)}/></div><div className="col-span-3"><Label>القيمة</Label><Controller control={form.control} name={`partners.${idx}.value` as const} render={({ field }) => (<NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} />)}/></div><div className="col-span-2 flex items-center justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => removePartner(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>))}</div>}
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
              <Button type="submit" className="mt-1">
                <PlusCircle className="me-2 h-4 w-4" />
                إضافة للفترة
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
});

// ---------- Wrapper: AddSegmentPeriodDialog ----------

export default function AddSegmentPeriodDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();
  const { user } = useAuth() || {};
  const addCompanyFormRef = React.useRef<{ resetForm: () => void }>(null);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const periodForm = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      currency: (navData?.settings?.currencySettings?.defaultCurrency || "USD"),
      entries: [],
    },
  });

  const { control, getValues, reset } = periodForm;
  const { fields, append, remove } = useFieldArray({ control, name: "entries" as const });
  
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);

  const currencyList =
    (navData?.settings?.currencySettings?.currencies || [{ code: "USD", name: "USD" }, { code: "IQD", name: "IQD" }, { code: "SAR", name: "SAR" }])
      .map((c: any) => ({ value: c.code, label: c.name }));

  const addEntry = (entry: any) => {
    append(entry);
    toast({ title: "تمت إضافة الشركة إلى الفترة." });
    addCompanyFormRef.current?.resetForm();
  };

  const handleSave = async () => {
    const v = await periodForm.trigger();
    if (!v) { toast({ title: "أكمل حقول الفترة والعملة.", variant: "destructive" }); return; }
    if (fields.length === 0) { toast({ title: "لا توجد سجلات ضمن هذه الفترة.", variant: "destructive" }); return; }

    setIsSaving(true);
    const values = getValues();
    const userId = user?.uid || null;
    const fundBoxId = (navData?.boxes || []).find((b: any) => b.ownerId === userId)?.id || (navData?.boxes?.[0]?.id) || null;


    if (!fundBoxId) { toast({ title: "خطأ", description: "لم يتم تحديد صندوق للمستخدم الحالي.", variant: "destructive" }); setIsSaving(false); return; }

    const payload = fields.map((f: any) => ({
      ...f,
      fromDate: format(values.fromDate!, 'yyyy-MM-dd'),
      toDate: format(values.toDate!, 'yyyy-MM-dd'),
      currency: values.currency,
      userId,
      fundBoxId,
      createdAt: new Date().toISOString(),
      alrawdatainShare: f.computed?.rodatainShare,
      partnerShare: f.computed?.partnersTotal,
      total: f.computed?.net,
      ticketProfits: f.computed?.perService.totalTickets,
      otherProfits: f.computed?.perService.totalVisas + f.computed?.perService.totalHotels + f.computed?.perService.totalGroups,
      partnerShares: f.computed?.partnerBreakdown.map((p: any) => ({ partnerId: p.relationId, partnerName: p.relationName, share: p.share })),
    }));
    
    try {
      const res = await addSegmentEntries(payload as any);
      if (!res?.success) throw new Error(res?.error || "فشل الحفظ");
      toast({ title: "تم حفظ بيانات الفترة بنجاح" });
      reset({ fromDate: values.fromDate, toDate: values.toDate, currency: values.currency, entries: [] });
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
        <Button><PlusCircle className="me-2 h-4 w-4" /> إضافة سجل جديد</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>إضافة سجل سكمنت جديد</DialogTitle></DialogHeader>

        <FormProvider {...periodForm}>
          <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-4">
            <Card className="border rounded-lg">
              <CardContent className="grid md:grid-cols-3 gap-3 py-4">
                 <FormField control={control} name="fromDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>من تاريخ</FormLabel>
                      <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsFromCalendarOpen(false);}} initialFocus /></PopoverContent></Popover>
                      <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={control} name="toDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>إلى تاريخ</FormLabel>
                      <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsToCalendarOpen(false);}} initialFocus /></PopoverContent></Popover>
                      <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={control} name="currency" render={({ field }) => (
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
                  )}
                />
              </CardContent>
            </Card>

            <AddCompanyToSegmentForm onAddEntry={addEntry} ref={addCompanyFormRef} />

            <Card className="border rounded-lg">
              <CardHeader className="py-3"><CardTitle className="text-base">الشركات المضافة ({fields.length})</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشركة</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>الخصم</TableHead>
                        <TableHead>الصافي</TableHead>
                        <TableHead>حصة الروضتين</TableHead>
                        <TableHead>الشركاء</TableHead>
                        <TableHead className="w-[60px] text-center">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center h-20">لا توجد شركات مضافة</TableCell></TableRow>
                      ) : fields.map((f: any, i: number) => {
                        const sym = useCurrencySymbol(getValues("currency"));
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.clientName || f.clientId}</TableCell>
                            <TableCell className="font-mono">{f.computed?.gross?.toFixed(2)} {sym}</TableCell>
                            <TableCell className="font-mono">{f.computed?.discountAmt?.toFixed(2)} {sym}</TableCell>
                            <TableCell className="font-mono">{f.computed?.net?.toFixed(2)} {sym}</TableCell>
                            <TableCell className="font-mono text-green-600">{f.computed?.rodatainShare?.toFixed(2)} {sym}</TableCell>
                            <TableCell className="font-mono text-blue-600">{f.computed?.partnersTotal?.toFixed(2)} {sym}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" onClick={() => remove(i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </FormProvider>

        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            <Save className="me-2 h-4 w-4" />
            حفظ الفترة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
