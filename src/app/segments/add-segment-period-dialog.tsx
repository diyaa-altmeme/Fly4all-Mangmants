
"use client";

import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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

import { PlusCircle, Save, Trash2, Settings2, ChevronDown, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Hash, User as UserIcon, Wallet, Building, Briefcase, Ticket, CreditCard, Hotel, Users as GroupsIcon, Percent, Loader2, X, Pencil, AlertCircle, HandCoins } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
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
} from "@/components/ui/alert-dialog";
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SegmentEntry, SegmentSettings, Client, Supplier, Currency } from '@/lib/types';

// ---------- Schemas ----------

const partnerSchema = z.object({
  id: z.string(),
  relationId: z.string().min(1, "اختر شريكاً من قائمة العلاقات."),
  relationName: z.string().min(1),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
  notes: z.string().optional(),
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
  
  hasPartner: z.boolean().default(false),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(100),
  partners: z.array(partnerSchema).default([]),
  notes: z.string().optional(),
});

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  currency: z.string().min(1, "اختر العملة."),
  entries: z.array(companyEntrySchema.extend({
      computed: z.any()
  })).default([]),
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

  const net = totalTickets + totalVisas + totalHotels + totalGroups;
  const rodatainShare = (net * (d.hasPartner ? d.alrawdatainSharePercentage : 100)) / 100;
  const partnerPool   = Math.max(0, net - rodatainShare);

  const partnerBreakdown = (d.partners || []).map(p => {
      let share = 0;
      if (p.type === "percentage") {
          share = partnerPool * (p.value / 100);
      } else { // fixed
          share = p.value;
      }
      return { ...p, share };
  });

  const partnersTotal = partnerBreakdown.reduce((s, p) => s + p.share, 0);

  return {
    perService: { totalTickets, totalVisas, totalHotels, totalGroups },
    net,
    rodatainShare,
    partnerPool,
    partnerBreakdown,
    partnersTotal,
    remainder: partnerPool - partnersTotal,
  };
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
  const { data: navData } = useVoucherNav();
  const parentForm = useFormContext<PeriodFormValues>();
  
  const count = Number(useWatch({ control, name: countField as any }) || 0);
  const type = (useWatch({ control, name: typeField as any }) as "fixed" | "percentage") || "fixed";
  const val  = Number(useWatch({ control, name: valueField as any }) || 0);
  const currency = parentForm.watch('currency');

  const result = useMemo(() => computeService(count, type, val), [count, type, val]);
  const currencySymbol = navData?.settings.currencySettings?.currencies.find(c => c.code === currency)?.symbol || '$';

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
        <div className="grid grid-cols-2 gap-2">
           <div className="space-y-1">
            <Label className="text-xs">النوع</Label>
            <Controller
              control={control}
              name={typeField as any}
              render={({ field }) => (
                 <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                        <SelectItem value="percentage">نسبة %</SelectItem>
                    </SelectContent>
                 </Select>
              )}
            />
          </div>
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
ServiceLine.displayName = "ServiceLine";

// ---------- AddCompanyToSegmentForm ----------

const AddCompanyToSegmentForm = forwardRef(function AddCompanyToSegmentForm(
  { onAddEntry, partnerOptions }: { onAddEntry: (data: any) => void; partnerOptions: any[] },
  ref
) {
  const { data: navData } = useVoucherNav();
  const { toast } = useToast();
  
  const companyOptions = useMemo(() => 
    (navData?.clients || []).filter(c => c.type === 'company').map((c: any) => ({ value: c.id, label: c.name, settings: c.segmentSettings })),
    [navData?.clients]
  );
  
  const form = useForm<CompanyEntryFormValues>({
    resolver: zodResolver(companyEntrySchema),
    defaultValues: {
      clientId: "", clientName: "",
      tickets: 0, visas: 0, hotels: 0, groups: 0,
      ticketProfitType: "fixed", ticketProfitValue: 1,
      visaProfitType: "fixed", visaProfitValue: 1,
      hotelProfitType: "fixed", hotelProfitValue: 1,
      groupProfitType: "fixed", groupProfitValue: 1,
      hasPartner: false,
      alrawdatainSharePercentage: 100,
      partners: [],
    },
  });

  useImperativeHandle(ref, () => ({ resetForm: () => form.reset() }), [form]);

  const watchAll = useWatch({ control: form.control });
  const totals = useMemo(() => computeTotals(watchAll as CompanyEntryFormValues), [watchAll]);

  const currentClientId = useWatch({ control: form.control, name: "clientId" }) as string;
  useEffect(() => {
    if (!currentClientId) return;
    const client = navData?.clients?.find(c => c.id === currentClientId);
    if (client?.segmentSettings) {
      form.setValue("ticketProfitType", client.segmentSettings.ticketProfitType);
      form.setValue("ticketProfitValue", client.segmentSettings.ticketProfitValue);
      form.setValue("visaProfitType", client.segmentSettings.visaProfitType);
      form.setValue("visaProfitValue", client.segmentSettings.visaProfitValue);
      form.setValue("hotelProfitType", client.segmentSettings.hotelProfitType);
      form.setValue("hotelProfitValue", client.segmentSettings.hotelProfitValue);
      form.setValue("groupProfitType", client.segmentSettings.groupProfitValue);
      form.setValue("groupProfitValue", client.segmentSettings.groupProfitValue);
      form.setValue("alrawdatainSharePercentage", client.segmentSettings.alrawdatainSharePercentage);
    }
  }, [currentClientId, form, navData?.clients]);

  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
    control: form.control,
    name: "partners",
  });
  
  const onAdd = (data: CompanyEntryFormValues) => {
    const computed = computeTotals(data);
     if (data.hasPartner && Math.abs(computed.remainder) > 0.01) {
      toast({
        title: "المبلغ الموزع غير مكتمل",
        description: `يوجد مبلغ متبقي (${computed.remainder.toFixed(2)}) لم يتم توزيعه على الشركاء.`,
        variant: "destructive",
      });
      return;
    }
    onAddEntry({ ...data, computed });
    form.reset({
      ...form.getValues(),
      tickets: 0, visas: 0, hotels: 0, groups: 0,
      partners: [],
      hasPartner: false,
      alrawdatainSharePercentage: 100,
      notes: '',
    });
  };

  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const [currentPartnerType, setCurrentPartnerType] = useState<'percentage' | 'fixed'>('percentage');
  const [currentPartnerValue, setCurrentPartnerValue] = useState<number | string>('');

  const onAddPartner = () => {
    if (!currentPartnerId || !currentPartnerValue) {
        toast({ title: "الرجاء تحديد الشريك والقيمة", variant: 'destructive' });
        return;
    }
    const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
    if (!selectedPartner) {
        toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
        return;
    }
    appendPartner({
        id: uuidv4(),
        relationId: selectedPartner.value,
        relationName: selectedPartner.label,
        type: currentPartnerType,
        value: Number(currentPartnerValue),
        notes: '',
    });
    setCurrentPartnerId('');
    setCurrentPartnerType('percentage');
    setCurrentPartnerValue('');
  };

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

                <div className="flex items-center justify-between">
                    <Controller
                        control={form.control}
                        name="hasPartner"
                        render={({ field }) => (
                            <div className="flex items-center gap-2">
                                <Switch checked={field.value} onCheckedChange={field.onChange} id="has-partners-switch" />
                                <Label htmlFor="has-partners-switch" className="font-semibold">توزيع الأرباح على الشركاء</Label>
                            </div>
                        )}
                    />
                </div>
                
                <Collapsible open={form.watch('hasPartner')}>
                    <CollapsibleContent className="pt-3 space-y-3">
                        <div className="p-4 border rounded-lg bg-background/50">
                            <h3 className="font-semibold text-base mb-2">توزيع الأرباح</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <div className="font-bold text-blue-600 font-mono p-2 bg-blue-50 dark:bg-blue-950/50 rounded-md">صافي الربح<span className="block">{totals.net.toFixed(2)}</span></div>
                                <div className="font-bold text-green-600 font-mono p-2 bg-green-50 dark:bg-green-950/50 rounded-md">حصة الروضتين<span className="block">{totals.rodatainShare.toFixed(2)}</span></div>
                                <div className="font-bold text-purple-600 font-mono p-2 bg-purple-50 dark:bg-purple-950/50 rounded-md">المتاح للشركاء<span className="block">{totals.partnerPool.toFixed(2)}</span></div>
                                <div className={cn("font-bold font-mono p-2 rounded-md", Math.abs(totals.remainder) > 0.01 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600")}>المتبقي للتوزيع<span className="block">{totals.remainder.toFixed(2)}</span></div>
                            </div>
                            <Separator />
                            <div className="mt-4">
                                <h4 className="font-semibold text-sm mb-2">إضافة شريك</h4>
                                <div className="flex items-end gap-2 p-2 rounded-lg bg-muted/50">
                                    <div className="flex-grow space-y-1.5"><Label className="text-xs">الشريك</Label><Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريكًا..."/></div>
                                    <div className="w-24 space-y-1.5"><Label className="text-xs">النوع</Label><Select value={currentPartnerType} onValueChange={(v: any) => setCurrentPartnerType(v)}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">مبلغ</SelectItem></SelectContent></Select></div>
                                    <div className="w-32 space-y-1.5"><Label className="text-xs">القيمة</Label><NumericInput value={currentPartnerValue} onValueChange={setCurrentPartnerValue} className="h-9" /></div>
                                    <Button type="button" size="icon" className="shrink-0 h-9 w-9" onClick={onAddPartner} disabled={totals.remainder <= 0 && currentPartnerType === 'percentage'}><PlusCircle className="h-5 w-5"/></Button>
                                </div>
                            </div>
                            {partnerFields.length > 0 && <div className="mt-4">
                                <h4 className="font-semibold text-sm mb-2">الشركاء المضافون</h4>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableBody>
                                            {partnerFields.map((field, index) => {
                                                const computedPartner = totals.partnerBreakdown.find(p => p.id === field.id);
                                                return (
                                                    <TableRow key={field.id}>
                                                        <TableCell className="font-semibold p-2">{computedPartner?.relationName}</TableCell>
                                                        <TableCell className="p-2">{field.type === 'percentage' ? `${field.value}%` : `مبلغ ثابت`}</TableCell>
                                                        <TableCell className="font-mono font-bold p-2 text-blue-600">{computedPartner?.share.toFixed(2)} USD</TableCell>
                                                        <TableCell className="p-1 text-center"><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePartner(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
            <CardFooter className="p-3 border-t">
                <Button type="button" onClick={form.handleSubmit(onAdd)} className="w-full" disabled={form.watch('hasPartner') && Math.abs(totals.remainder) > 0.01}>
                    <PlusCircle className="me-2 h-4 w-4" />
                    إضافة للفترة
                </Button>
            </CardFooter>
        </Card>
    </FormProvider>
  );
});
AddCompanyToSegmentForm.displayName = "AddCompanyToSegmentForm";

// ---------- Wrapper: AddSegmentPeriodDialog ----------

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const { data: navData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [step, setStep] = useState(1);
    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
    const companyFormRef = React.useRef<{ resetForm: () => void }>(null);
    
    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    
    const { control, getValues, reset: resetPeriodForm, trigger } = periodForm;
    const { fields, append, remove } = useFieldArray({ control, name: "entries" as const });
    
    const currencyList =
      (navData?.settings?.currencySettings?.currencies || [{ code: "USD", name: "USD" }, { code: "IQD", name: "IQD" }, { code: "SAR", name: "SAR" }])
        .map((c: any) => ({ value: c.code, label: c.name }));
    
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
    }, [navData]);

    useEffect(() => {
        if (open) {
            resetPeriodForm({ fromDate: undefined, toDate: undefined, currency: 'USD', entries: [] });
            companyFormRef.current?.resetForm();
            setStep(1);
        }
    }, [open, resetPeriodForm]);
    
    const boxName = useMemo(() => {
      if (!currentUser || !('boxId' in currentUser)) return 'غير محدد';
      return navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد';
    }, [currentUser, navData?.boxes]);

    const addEntry = (entry: any) => {
        append(entry);
        toast({ title: "تمت إضافة الشركة إلى الفترة." });
    };
    
    const removeEntry = (index: number) => {
        remove(index);
    }

    const goToNextStep = async () => {
        const isValid = await trigger();
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
            partnerShare: entry.computed.partnersTotal, // This is the total for all partners
            total: entry.computed.net,
            ticketProfits: entry.computed.perService.totalTickets,
            otherProfits: entry.computed.perService.totalVisas + entry.computed.perService.totalHotels + entry.computed.perService.totalGroups,
            partnerShares: entry.computed.partnerBreakdown.map((p: any) => ({ partnerId: p.relationId, partnerName: p.relationName, share: p.share })),
        }));
        
        try {
            const res = await addSegmentEntries(finalEntries as any);
            if (!res?.success) throw new Error(res?.error || "فشل الحفظ");
            toast({ title: "تم حفظ بيانات الفترة بنجاح" });
            resetPeriodForm({ fromDate: periodData.fromDate, toDate: periodData.toDate, currency: periodData.currency, entries: [] });
            await onSuccess();
            setOpen(false);
        } catch (e: any) {
            toast({ title: "خطأ في الحفظ", description: e?.message || "حصل خطأ غير متوقع", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const { grandTotalProfit, grandTotalAlrawdatainShare, grandTotalPartnerShare } = React.useMemo(() => {
        return fields.reduce((acc: any, entry: any) => {
            acc.grandTotalProfit += entry.computed.net;
            acc.grandTotalAlrawdatainShare += entry.computed.rodatainShare;
            acc.grandTotalPartnerShare += entry.computed.partnersTotal;
            return acc;
        }, { grandTotalProfit: 0, grandTotalAlrawdatainShare: 0, grandTotalPartnerShare: 0 });
    }, [fields]);

    const currency = getValues('currency');
    const currencySymbol = navData?.settings.currencySettings?.currencies.find(c => c.code === currency)?.symbol || '$';

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
                                                    <FormControl><SelectTrigger><SelectValue placeholder="اختر العملة..." /></SelectTrigger></FormControl>
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
                                <AddCompanyToSegmentForm onAddEntry={addEntry} ref={companyFormRef} partnerOptions={partnerOptions}/>
                                <Card className="border rounded-lg">
                                    <CardHeader className="py-3"><CardTitle className="text-base">الشركات المضافة ({fields.length})</CardTitle></CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>الشريك</TableHead><TableHead>الإجمالي</TableHead><TableHead>حصة الروضتين</TableHead><TableHead>حصة الشريك</TableHead><TableHead className="w-[60px] text-center">حذف</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {fields.length === 0 ? (
                                                        <TableRow><TableCell colSpan={6} className="text-center h-20">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                                    ) : fields.map((f: any, i: number) => (
                                                        <TableRow key={f.id}>
                                                            <TableCell className="font-medium">{f.clientName || f.clientId}</TableCell>
                                                            <TableCell>{f.computed?.partnerBreakdown?.map((p:any) => p.relationName).join(', ')}</TableCell>
                                                            <TableCell className="font-mono">{f.computed?.net?.toFixed(2)} {currencySymbol}</TableCell>
                                                            <TableCell className="font-mono text-green-600">{f.computed?.rodatainShare?.toFixed(2)} {currencySymbol}</TableCell>
                                                            <TableCell className="font-mono text-blue-600">{f.computed?.partnersTotal?.toFixed(2)} {currencySymbol}</TableCell>
                                                            <TableCell className='text-center'>
                                                              <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(i)}><Trash2 className='h-4 w-4'/></Button>
                                                            </TableCell>
                                                          </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <StatCard title="إجمالي أرباح السكمنت" value={grandTotalProfit} currency={currencySymbol} className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30" />
                                        <StatCard title="إجمالي حصة الروضتين" value={grandTotalAlrawdatainShare} currency={currencySymbol} className="border-green-500/50 bg-green-50 dark:bg-green-950/30" />
                                        <StatCard title="إجمالي حصص الشركاء" value={grandTotalPartnerShare} currency={currencySymbol} className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/30" />
                                    </CardFooter>
                                </Card>
                            </>
                        )}
                    </div>
                </FormProvider>

                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    {step === 1 && (
                        <div className="flex justify-between w-full">
                            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="button" onClick={goToNextStep}>التالي<ArrowLeft className="ms-2 h-4 w-4" /></Button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="flex justify-between w-full">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowRight className="me-2 h-4 w-4" />
                                رجوع
                            </Button>
                            <Button type="button" onClick={handleSavePeriod} disabled={isSaving || fields.length === 0} className="sm:w-auto">
                                {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                حفظ بيانات الفترة ({fields.length} سجلات)
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const StatCard = ({ title, value, currency, className }: { title: string; value: number; currency: string; className?: string; }) => (
    <div className={cn("text-center p-3 rounded-lg bg-background border", className)}>
        <p className="text-sm text-muted-foreground font-bold">{title}</p>
        <p className="font-bold font-mono text-xl">
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
        </p>
    </div>
);

    