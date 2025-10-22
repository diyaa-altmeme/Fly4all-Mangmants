
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
import { addSegmentEntries, deleteSegmentPeriod } from "@/app/segments/actions";
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
} from "@/components/ui/alert-dialog"
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SegmentEntry, SegmentSettings, Client, Supplier, Currency, ProfitShare } from '@/lib/types';


// ---------- Schemas ----------

const partnerSchema = z.object({
  id: z.string(),
  partnerId: z.string().min(1, "اختر شريكاً من قائمة العلاقات."),
  partnerName: z.string().min(1),
  percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا تتجاوز 100."),
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
      const share = partnerPool * (p.percentage / 100);
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
  const currencySymbol = navData?.settings?.currencySettings?.currencies.find(c => c.code === currency)?.symbol || '$';

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
  { onAddEntry, onUpdateEntry, editingEntry, onCancelEdit, partnerOptions }: { 
    onAddEntry: (data: any) => void;
    onUpdateEntry: (data: any) => void;
    editingEntry: CompanyEntryFormValues | null;
    onCancelEdit: () => void;
    partnerOptions: any[] 
  },
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
  });

  const { control, handleSubmit, watch: watchCompanyForm, setValue: setCompanyValue, reset: resetCompanyForm } = form;

  useEffect(() => {
    if (editingEntry) {
      form.reset(editingEntry);
    } else {
      form.reset({
        clientId: "", clientName: "",
        tickets: 0, visas: 0, hotels: 0, groups: 0,
        ticketProfitType: "fixed", ticketProfitValue: 1,
        visaProfitType: "fixed", visaProfitValue: 1,
        hotelProfitType: "fixed", hotelProfitValue: 1,
        groupProfitType: "fixed", groupProfitValue: 1,
        hasPartner: false,
        alrawdatainSharePercentage: 100,
        partners: [],
      });
    }
  }, [editingEntry, form]);


  useImperativeHandle(ref, () => ({ resetForm: () => form.reset() }), [form]);

  const watchAll = useWatch({ control: form.control });
  const totals = useMemo(() => computeTotals(watchAll as CompanyEntryFormValues), [watchAll]);

  const currentClientId = useWatch({ control, name: "clientId" }) as string;
  useEffect(() => {
    if (!currentClientId) return;
    const client = navData?.clients?.find(c => c.id === currentClientId);
    if (client?.segmentSettings) {
      setCompanyValue("ticketProfitType", client.segmentSettings.ticketProfitType);
      setCompanyValue("ticketProfitValue", client.segmentSettings.ticketProfitValue);
      setCompanyValue("visaProfitType", client.segmentSettings.visaProfitType);
      setCompanyValue("visaProfitValue", client.segmentSettings.visaProfitValue);
      setCompanyValue("hotelProfitType", client.segmentSettings.hotelProfitType);
      setCompanyValue("hotelProfitValue", client.segmentSettings.hotelProfitValue);
      setCompanyValue("groupProfitType", client.segmentSettings.groupProfitType);
      setCompanyValue("groupProfitValue", client.segmentSettings.groupProfitValue);
      setCompanyValue("alrawdatainSharePercentage", client.segmentSettings.alrawdatainSharePercentage);
    }
  }, [currentClientId, setCompanyValue, navData?.clients]);

  const { fields: partnerFields, append: appendPartner, remove: removePartner } = useFieldArray({
    control: form.control,
    name: "partners",
  });
  
  const onSubmit = (data: CompanyEntryFormValues) => {
    const computed = computeTotals(data);
     if (data.hasPartner && Math.abs(computed.remainder) > 0.01) {
      toast({
        title: "المبلغ الموزع غير مكتمل",
        description: `يوجد مبلغ متبقي (${computed.remainder.toFixed(2)}) لم يتم توزيعه على الشركاء.`,
        variant: "destructive",
      });
      return;
    }
    
    if (editingEntry) {
        onUpdateEntry({ ...data, computed });
    } else {
        onAddEntry({ ...data, computed });
    }
  };

  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const [currentPartnerPercentage, setCurrentPartnerPercentage] = useState<number | string>('');

   const partnerSharePreview = useMemo(() => {
    const value = Number(currentPartnerPercentage) || 0;
    return totals.partnerPool * (value / 100);
  }, [currentPartnerPercentage, totals.partnerPool]);

  const onAddPartner = () => {
      if(!currentPartnerId || !currentPartnerPercentage) {
          toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
          return;
      }
      const newPercentage = Number(currentPartnerPercentage);
      if (isNaN(newPercentage) || newPercentage <= 0) {
          toast({ title: "النسبة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
          return;
      }
      const currentTotalPartnerPercentage = (form.getValues('partners') || []).reduce((sum, p) => sum + p.percentage, 0);

      if (currentTotalPartnerPercentage + newPercentage > 100) {
           toast({ title: "لا يمكن تجاوز 100%", description: `النسبة المتبقية المتاحة هي: ${100 - currentTotalPartnerPercentage}%`, variant: 'destructive' });
           return;
      }

      const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
      if(!selectedPartner) {
           toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
           return;
      }
      
      const newPartner: PartnerFormValues = { id: uuidv4(), partnerId: selectedPartner.value, partnerName: selectedPartner.label, percentage: newPercentage, type: 'percentage' };
      appendPartner(newPartner);
      setCurrentPartnerId('');
      setCurrentPartnerPercentage('');
  };

  return (
    <FormProvider {...form}>
        <Card className="border rounded-lg shadow-sm">
            <CardHeader className="py-3">
                <CardTitle className="text-base">{editingEntry ? `تعديل بيانات: ${editingEntry.clientName}` : 'إضافة شركة للفترة الحالية'}</CardTitle>
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
                                        setCompanyValue("clientName", found?.label || "");
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end p-2 rounded-lg bg-muted/50">
                                    <div className="space-y-1.5"><Label className="text-xs">الشريك</Label><Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريكًا..."/></div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">النسبة (%)</Label>
                                        <div className="relative">
                                            <NumericInput value={currentPartnerPercentage} onValueChange={setCurrentPartnerPercentage} className="h-9 pe-7" />
                                            <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                         <div className="flex-grow">
                                            <Label className="text-xs">الحصة المستلمة</Label>
                                            <div className="h-9 flex items-center justify-center font-bold text-blue-600 font-mono p-2 bg-blue-50 rounded-md">
                                                {partnerSharePreview.toFixed(2)}
                                            </div>
                                        </div>
                                        <Button type="button" size="icon" className="shrink-0 h-9 w-9" onClick={onAddPartner} disabled={totals.partnerPool <= 0}><PlusCircle className="h-5 w-5"/></Button>
                                    </div>
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
                                                        <TableCell className="font-semibold p-2">{computedPartner?.partnerName}</TableCell>
                                                        <TableCell className="p-2">{field.type === 'percentage' ? `${field.value}%` : `مبلغ ثابت`}</TableCell>
                                                        <TableCell className="font-mono font-bold p-2 text-blue-600">{computedPartner?.share.toFixed(2)}</TableCell>
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
                <div className="flex justify-end gap-2 w-full">
                    {editingEntry && <Button type="button" variant="ghost" onClick={onCancelEdit}>إلغاء التعديل</Button>}
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} className="flex-grow">
                        <PlusCircle className="me-2 h-4 w-4" />
                        {editingEntry ? 'تحديث الشركة في الفترة' : 'إضافة للفترة الحالية'}
                    </Button>
                </div>
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
  isEditing?: boolean;
  existingPeriod?: any;
  children?: React.ReactNode;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess, isEditing, existingPeriod, children }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCompany, setEditingCompany] = useState<CompanyEntryFormValues | null>(null);

    const companyFormRef = React.useRef<{ resetForm: () => void }>(null);
    
    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    
    const { control, getValues, reset: resetPeriodForm, trigger, handleSubmit: handlePeriodSubmit, watch: watchPeriodForm } = periodForm;
    const { fields, append, remove, update } = useFieldArray({ control, name: "entries" as const });
    
    const { data: navData } = useVoucherNav();
    
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

    useEffect(() => {
        if (open) {
            const fromDate = existingPeriod?.fromDate ? parseISO(existingPeriod.fromDate) : undefined;
            const toDate = existingPeriod?.toDate ? parseISO(existingPeriod.toDate) : undefined;
            const currency = existingPeriod?.entries?.[0]?.currency || 'USD';
            const entries = (existingPeriod?.entries || []).map((e: any) => ({
              ...e,
              computed: computeTotals(e),
              partners: e.partnerShares?.map((p: any) => ({
                  id: p.partnerId,
                  partnerId: p.partnerId,
                  partnerName: p.partnerName,
                  type: 'fixed', // Assumption, this needs to be stored if we want to edit percentages
                  value: p.share,
              })) || []
            }));

            resetPeriodForm({ fromDate, toDate, currency, entries });
            companyFormRef.current?.resetForm();
        }
    }, [open, existingPeriod, resetPeriodForm, companyFormRef]);
    
    const addEntry = (entry: any) => {
      append(entry);
    };

    const updateEntry = (index: number, entry: any) => {
        update(index, entry);
        setEditingCompany(null);
    };
    
    const removeEntry = (index: number) => remove(index);

    const handleEditEntry = (entry: any, index: number) => {
        setEditingCompany(entry);
    }
    
    const handleSavePeriod = async () => {
        // Full save logic
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
                 {children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "تعديل فترة سكمنت" : "إضافة فترة سكمنت جديدة"}</DialogTitle>
                </DialogHeader>

                <FormProvider {...periodForm}>
                    <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                        <div className="p-4 border rounded-lg bg-background/50">
                            <h3 className="font-semibold text-base mb-2">الفترة المحاسبية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                {/* Date pickers and currency select here */}
                            </div>
                        </div>
                         <AddCompanyToSegmentForm
                          ref={companyFormRef}
                          onAddEntry={addEntry}
                          onUpdateEntry={(data) => {
                            if (editingCompany && 'id' in editingCompany) {
                               const index = fields.findIndex(f => f.id === (editingCompany as any).id);
                               if (index > -1) updateEntry(index, data);
                            }
                          }}
                          editingEntry={editingCompany}
                          onCancelEdit={() => setEditingCompany(null)}
                          partnerOptions={partnerOptions}
                        />
                          <Card className="border rounded-lg">
                            <CardHeader className="py-3"><CardTitle className="text-base">الشركات المضافة ({fields.length})</CardTitle></CardHeader>
                            <CardContent className="pt-0">
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>الشريك</TableHead><TableHead>الإجمالي</TableHead><TableHead>حصة الروضتين</TableHead><TableHead>حصة الشريك</TableHead><TableHead className="w-[100px] text-center">الإجراءات</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {fields.length === 0 ? (
                                                <TableRow><TableCell colSpan={6} className="text-center h-20">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                            ) : fields.map((f: any, i: number) => (
                                                <TableRow key={f.id}>
                                                    <TableCell className="font-medium">{f.clientName || f.clientId}</TableCell>
                                                    <TableCell>{f.partners?.map((p:any) => p.partnerName).join(', ')}</TableCell>
                                                    <TableCell className="font-mono">{f.computed?.net?.toFixed(2)} {currencySymbol}</TableCell>
                                                    <TableCell className="font-mono text-green-600">{f.computed?.rodatainShare?.toFixed(2)} {currencySymbol}</TableCell>
                                                    <TableCell className="font-mono text-blue-600">{f.computed?.partnersTotal?.toFixed(2)} {currencySymbol}</TableCell>
                                                    <TableCell className='text-center space-x-1'>
                                                      <Button variant="ghost" size="icon" className='h-8 w-8 text-blue-600' onClick={() => handleEditEntry(f, i)}><Pencil className='h-4 w-4'/></Button>
                                                      <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(i)}><Trash2 className='h-4 w-4'/></Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Stat cards here */}
                            </CardFooter>
                        </Card>
                    </div>
                </FormProvider>
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <Button type="button" onClick={handleSavePeriod} disabled={isSaving || fields.length === 0} className="w-full sm:w-auto">
                        {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ بيانات الفترة ({fields.length} سجلات)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

```