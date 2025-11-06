
"use client";

import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { NumericInput } from "@/components/ui/numeric-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSegmentEntries } from "@/app/segments/actions";
import {
  PlusCircle, Trash2, Percent, Loader2, Ticket, CreditCard, Hotel, Users as GroupsIcon, ArrowDown, Save, Pencil, Building, User as UserIcon, Wallet, Hash, AlertTriangle, CheckCircle, ArrowRight, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FormProvider, useForm, useFieldArray, Controller, useWatch, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Client, Supplier, SegmentSettings, SegmentEntry, PartnerShareSetting, Currency } from '@/lib/types';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAuth } from '@/lib/auth-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Stepper, StepperItem, useStepper } from '@/components/ui/stepper';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getNextVoucherNumber } from '@/lib/sequences';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

const companyEntrySchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  clientName: z.string().min(1),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  ticketProfitType: z.enum(['fixed', 'percentage']).default('percentage'),
  ticketProfitValue: z.coerce.number().min(0).default(50),
  visaProfitType: z.enum(['fixed', 'percentage']).default('percentage'),
  visaProfitValue: z.coerce.number().min(0).default(100),
  hotelProfitType: z.enum(['fixed', 'percentage']).default('percentage'),
  hotelProfitValue: z.coerce.number().min(0).default(100),
  groupProfitType: z.enum(['fixed', 'percentage']).default('percentage'),
  groupProfitValue: z.coerce.number().min(0).default(100),
});

const partnerSchema = z.object({
  id: z.string(),
  partnerId: z.string().min(1, "اختر شريكاً."),
  partnerName: z.string(),
  partnerInvoiceNumber: z.string(), 
  percentage: z.coerce.number().min(0, "النسبة يجب أن تكون موجبة.").max(100, "النسبة لا تتجاوز 100."),
  amount: z.coerce.number(),
});

const periodSchema = z.object({
  periodId: z.string().optional(),
  periodInvoiceNumber: z.string().optional(),
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }).nullable(),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }).nullable(),
  entryDate: z.date({ required_error: "تاريخ الإضافة مطلوب." }),
  currency: z.string().min(1, "اختر العملة."),
  hasPartner: z.boolean().default(false),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(100),
  partners: z.array(partnerSchema).optional(),
  summaryEntries: z.array(z.any()).min(1, "يجب إضافة شركة واحدة على الأقل."),
});


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
export type PartnerShare = z.infer<typeof partnerSchema>;

function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeCompanyTotal(d: any, companySettings?: Partial<SegmentSettings>) {
    const settings = companySettings || {};
    return [
      computeService(d.tickets, d.ticketProfitType || 'percentage', d.ticketProfitValue || 50),
      computeService(d.visas, d.visaProfitType || 'percentage', d.visaProfitValue || 100),
      computeService(d.hotels, d.hotelProfitType || 'percentage', d.hotelProfitValue || 100),
      computeService(d.groups, d.groupProfitType || 'percentage', d.groupProfitValue || 100)
    ].reduce((sum, val) => sum + val, 0);
  }

const ServiceLine = ({ label, icon: Icon, color, countField, typeField, valueField }: any) => {
  const { control, watch } = useFormContext<CompanyEntryFormValues>();
  const count = watch(countField);
  const type = watch(typeField);
  const value = watch(valueField);

  const result = useMemo(() => computeService(count, type, value), [count, type, value]);
  const currency = useFormContext<PeriodFormValues>().watch('currency');

  return (
    <Card className="shadow-sm overflow-hidden" style={{ borderColor: `hsl(var(--${color}))`}}>
      <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 text-white" style={{ backgroundColor: `hsl(var(--${color}))`}}>
        <CardTitle className="text-xs font-bold flex items-center gap-1.5"><Icon className="h-4 w-4" />{label}</CardTitle>
        <div className="text-xs font-bold font-mono px-1.5 py-0.5 bg-background/20 rounded-md">{result.toFixed(2)}</div>
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-1">
        <Controller control={control} name={countField} render={({ field }) => (<div><Label className="sr-only">العدد</Label><NumericInput {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="العدد" className="h-8 text-center font-semibold text-sm" /></div>)} />
        <div className="flex gap-1">
            <Controller control={control} name={typeField} render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
            )}/>
             <Controller control={control} name={valueField} render={({ field }) => (<NumericInput currency={currency as Currency} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...field} onValueChange={(v) => field.onChange(v || 0)} placeholder="القيمة" className="h-7 text-xs" />)} />
        </div>
      </CardContent>
    </Card>
  );
};

interface AddCompanyToSegmentFormProps {
    onAdd: (data: any) => void;
    allCompanyOptions: { value: string; label: string; settings?: Partial<SegmentSettings> }[];
    partnerOptions: { value: string; label: string }[];
    editingEntry?: any;
    onCancelEdit: () => void;
}

const AddCompanyToSegmentForm = forwardRef(({ onAdd, allCompanyOptions, partnerOptions, editingEntry, onCancelEdit }: AddCompanyToSegmentFormProps, ref) => {
    const { getValues: getPeriodValues } = useFormContext<PeriodFormValues>();
    const [companyInvoiceNumber, setCompanyInvoiceNumber] = useState('(تلقائي)');
    
    const form = useForm<CompanyEntryFormValues>({
        resolver: zodResolver(companyEntrySchema),
    });
    
    const { reset, control, handleSubmit, watch, setValue } = form;

    const generateCompanyInvoiceNumber = useCallback(async () => {
        const compInv = await getNextVoucherNumber("COMP");
        setCompanyInvoiceNumber(compInv);
    }, []);

    React.useEffect(() => {
        const defaultValues = { id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "", ticketProfitType: 'percentage' as const, ticketProfitValue: 50, visaProfitType: 'percentage' as const, visaProfitValue: 100, hotelProfitType: 'percentage' as const, hotelProfitValue: 100, groupProfitType: 'percentage' as const, groupProfitValue: 100 };
        const companySettings = editingEntry?.clientId ? allCompanyOptions.find(c => c.value === editingEntry.clientId)?.settings : {};
        const initialFormValues = { ...defaultValues, ...companySettings, ...(editingEntry || {}) };
        reset(initialFormValues);
        if (!editingEntry) {
            generateCompanyInvoiceNumber();
        } else {
            setCompanyInvoiceNumber(editingEntry.companyInvoiceNumber);
        }
    }, [editingEntry, reset, allCompanyOptions, generateCompanyInvoiceNumber]);


    useImperativeHandle(ref, () => ({ resetForm: () => {
        reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
        generateCompanyInvoiceNumber();
    }}), [reset, generateCompanyInvoiceNumber]);

    const watchAll = watch();
    const currentClientId = watch('clientId');
    
    useEffect(() => {
        const company = allCompanyOptions.find(opt => opt.value === currentClientId);
        if (company) {
            setValue('clientName', company.label);
            if(company.settings) {
                Object.entries(company.settings).forEach(([key, value]) => {
                    setValue(key as keyof SegmentSettings, value);
                });
            }
        }
    }, [currentClientId, allCompanyOptions, setValue]);
    
    const total = useMemo(() => computeCompanyTotal(watchAll, allCompanyOptions.find(c => c.value === watchAll.clientId)?.settings), [watchAll, allCompanyOptions]);

    const handleAddClick = async (data: CompanyEntryFormValues) => {
        const { hasPartner, alrawdatainSharePercentage, partners } = getPeriodValues();
        const totalProfitForCompany = computeCompanyTotal(data, allCompanyOptions.find(c => c.value === data.clientId)?.settings);
        
        const partnerShareAmount = hasPartner 
            ? totalProfitForCompany * (100 - (alrawdatainSharePercentage || 0)) / 100
            : 0;

        const alrawdatainShare = totalProfitForCompany - partnerShareAmount;

        const partnerSharesWithInvoices = await Promise.all(
            (partners || []).map(async (p) => {
                const partnerInvoiceNumber = await getNextVoucherNumber("PARTNER");
                return {
                    partnerId: p.partnerId,
                    partnerName: p.partnerName,
                    partnerInvoiceNumber: partnerInvoiceNumber,
                    share: partnerShareAmount * (p.percentage / 100)
                };
            })
        );
        
        onAdd({ 
            ...data,
            companyInvoiceNumber: companyInvoiceNumber, 
            total: totalProfitForCompany,
            alrawdatainShare: alrawdatainShare,
            partnerShare: partnerShareAmount,
            partnerShares: partnerSharesWithInvoices
        });
        reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
        generateCompanyInvoiceNumber();
        onCancelEdit();
    };

    return (
        <FormProvider {...form}>
            <div className="space-y-3">
                 <Card className="border rounded-lg shadow-sm border-primary/40">
                    <CardHeader className="p-2 flex flex-row items-center justify-between bg-muted/30">
                        <CardTitle className="text-base font-semibold">{editingEntry ? `تعديل - فاتورة: ${companyInvoiceNumber}` : `إدخال شركة - فاتورة: ${companyInvoiceNumber}`}</CardTitle>
                        <div className='font-mono text-sm text-blue-600 font-bold'>ربح الشركة: {total.toFixed(2)}</div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3">
                        <Controller control={control} name="clientId" render={({ field, fieldState }) => (<div className="space-y-1"><Label>الجهة المصدرة للسكمنت</Label><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث/اختر..."/><p className="text-xs text-destructive h-3">{fieldState.error?.message}</p></div>)} />
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <ServiceLine label="تذاكر" icon={Ticket} color="primary" countField="tickets" typeField="ticketProfitType" valueField="ticketProfitValue" />
                            <ServiceLine label="فيزا" icon={CreditCard} color="accent" countField="visas" typeField="visaProfitType" valueField="visaProfitValue" />
                            <ServiceLine label="فنادق" icon={Hotel} color="primary" countField="hotels" typeField="hotelProfitType" valueField="hotelProfitValue" />
                            <ServiceLine label="كروبات" icon={GroupsIcon} color="accent" countField="groups" typeField="groupProfitType" valueField="groupProfitValue" />
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

const SummaryList = ({
  onRemove,
  onEdit,
}: {
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}) => {
  const { watch } = useFormContext<PeriodFormValues>();
  const summaryEntries = watch("summaryEntries");
  const { user: currentUser } = useAuth();


  if (!summaryEntries || summaryEntries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
        لم يتم إضافة أي شركات إلى الفترة حتى الآن.
      </div>
    );
  }

  return (
    <Card className="border border-muted shadow-sm">
      <CardHeader className="p-3 flex items-center justify-between bg-muted/20 rounded-t-md">
        <CardTitle className="text-base font-semibold">
          الشركات المضافة ({summaryEntries.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/40">
                <TableRow>
                <TableHead className="text-center">رقم فاتورة الشركة</TableHead>
                <TableHead>الشركة المصدرة للسكمنت</TableHead>
                <TableHead>الشركاء (مع أرقام فواتيرهم)</TableHead>
                <TableHead className="text-center">إجمالي المبلغ</TableHead>
                <TableHead className="text-center">حصة الروضتين</TableHead>
                <TableHead className="text-center">حصة الشركاء</TableHead>
                <TableHead className="text-center">موظف الإدخال</TableHead>
                <TableHead className="text-center w-[110px]">الإجراءات</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {summaryEntries.map((entry: any, index: number) => (
                <TableRow key={entry.id}>
                    <TableCell className="text-center font-mono">{entry.companyInvoiceNumber || "(تلقائي)"}</TableCell>
                    <TableCell className="font-semibold text-sm">{entry.clientName || "غير محدد"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                    {entry.partnerShares && entry.partnerShares.length > 0
                        ? entry.partnerShares.map((p: any) => `${p.partnerName} (${p.partnerInvoiceNumber})`).join("، ")
                        : "لا يوجد شركاء"}
                    </TableCell>
                    <TableCell className="text-center font-mono">{Number(entry.total || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono text-green-600">{Number(entry.alrawdatainShare || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono text-blue-600">{Number(entry.partnerShare || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center text-sm">{currentUser?.name || 'غير محدد'}</TableCell>
                    <TableCell className="text-center space-x-1 rtl:space-x-reverse">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        title="تعديل"
                        onClick={() => onEdit(index)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="حذف"
                        onClick={() => onRemove(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryStat = ({ title, value, currency, className }: { title: string; value: number; currency: Currency; className?: string; }) => (
    <div className={cn("p-2 rounded-lg text-center border", className)}>
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        <p className="font-mono font-bold text-lg">{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</p>
    </div>
);


interface AddSegmentPeriodDialogProps { clients: Client[]; suppliers: Supplier[]; onSuccess: () => Promise<void>; isEditing?: boolean; existingPeriod?: any; }

export default function EditSegmentPeriodDialog({ clients, suppliers, onSuccess, isEditing = false, existingPeriod }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const addCompanyFormRef = React.useRef<{ resetForm: () => void }>(null);
    const [editingEntry, setEditingEntry] = useState<any | null>(null);
    const { data: navData, fetchData } = useVoucherNav();
    const { user: currentUser } = useAuth();
    
    const [currentPartnerId, setCurrentPartnerId] = useState('');
    const [currentPercentage, setCurrentPercentage] = useState<number | string>('');
    const [editingPartnerIndex, setEditingPartnerIndex] = useState<number | null>(null);

    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const { control, handleSubmit: handlePeriodSubmit, watch, setValue, formState: { errors: periodErrors }, trigger, reset: resetForm, getValues } = periodForm;
    const { fields: summaryFields, append, remove, update } = useFieldArray({ control: periodForm.control, name: "summaryEntries" });
    const { fields: partnerFields, append: appendPartner, remove: removePartner, update: updatePartner } = useFieldArray({ control: periodForm.control, name: "partners" });
    
    const watchedPeriod = watch();
    
    const allCompanyOptions = useMemo(() => {
        const allRelations = [...(clients || []), ...(suppliers || [])];
        const uniqueRelations = Array.from(new Map(allRelations.map(item => [item.id, item])).values());
        return uniqueRelations.map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings }));
    }, [clients, suppliers]);

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
    
    const currencyOptions = useMemo(() => navData?.settings?.currencySettings?.currencies || [], [navData]);
    const boxName = useMemo(() => (currentUser && 'boxId' in currentUser && currentUser.boxId) ? navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد' : 'غير محدد', [currentUser, navData?.boxes]);

    useEffect(() => {
        if (open) {
            const defaultValues = {
                periodId: existingPeriod?.periodId,
                periodInvoiceNumber: existingPeriod?.invoiceNumber,
                fromDate: existingPeriod?.fromDate ? parseISO(existingPeriod.fromDate) : null,
                toDate: existingPeriod?.toDate ? parseISO(existingPeriod.toDate) : null,
                entryDate: new Date(),
                currency: existingPeriod?.entries?.[0]?.currency || navData?.settings?.currencySettings?.defaultCurrency || 'USD',
                hasPartner: existingPeriod?.entries?.[0]?.hasPartner || false,
                alrawdatainSharePercentage: existingPeriod?.entries?.[0]?.alrawdatainSharePercentage || navData?.settings?.segmentSettings?.alrawdatainSharePercentage || 50,
                partners: (existingPeriod?.entries?.[0]?.partnerShares || []).map((p: any) => ({
                    id: p.partnerId,
                    partnerId: p.partnerId,
                    partnerName: p.partnerName,
                    partnerInvoiceNumber: p.partnerInvoiceNumber || '',
                    percentage: (p.share / (existingPeriod.entries[0]?.partnerShare || 1)) * 100, // Re-calculate percentage
                    amount: p.share
                })),
                summaryEntries: existingPeriod?.entries.map((e: SegmentEntry) => ({...e})) || [],
            };
            resetForm(defaultValues);
            setEditingEntry(null);
        }
    }, [open, isEditing, existingPeriod, resetForm, navData]);

    const grandTotalProfit = useMemo(() => (summaryFields || []).reduce((sum, e) => sum + (e.total || 0), 0), [summaryFields]);
    
    const { 
        totalPartnerPercentage, 
        alrawdatainSharePercentage,
        alrawdatainShareAmount, 
        amountForPartners, 
        distributedToPartners, 
        remainderForPartners 
    } = useMemo(() => {
        const hasPartner = watchedPeriod.hasPartner;
        const alrawdatainPerc = hasPartner ? (Number(watchedPeriod.alrawdatainSharePercentage) || 0) : 100;
        const partnerPercTotal = (watchedPeriod.partners || []).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
        
        const alrawdatainAmount = grandTotalProfit * (alrawdatainPerc / 100);
        const availableForPartnersAmount = grandTotalProfit - alrawdatainAmount;
        
        const distributedAmount = (watchedPeriod.partners || []).reduce((acc, p) => {
            const share = availableForPartnersAmount * ((p.percentage || 0) / 100);
            return acc + share;
        }, 0);

        return { 
            totalPartnerPercentage: partnerPercTotal, 
            alrawdatainSharePercentage: alrawdatainPerc,
            alrawdatainShareAmount: alrawdatainAmount,
            amountForPartners: availableForPartnersAmount,
            distributedToPartners: distributedAmount,
            remainderForPartners: availableForPartnersAmount - distributedAmount,
        };
    }, [grandTotalProfit, watchedPeriod.hasPartner, watchedPeriod.alrawdatainSharePercentage, watchedPeriod.partners]);
    
    const partnerSharePreview = useMemo(() => {
        const value = Number(currentPercentage) || 0;
        return amountForPartners * (value / 100);
    }, [currentPercentage, amountForPartners]);

    const handleAddOrUpdateEntry = (entryData: any) => {
        if (editingEntry) {
            const index = summaryFields.findIndex(f => f.id === editingEntry.id);
            if (index > -1) update(index, { ...summaryFields[index], ...entryData, id: summaryFields[index].id });
            setEditingEntry(null);
        } else {
            append({ ...entryData, id: uuidv4(), createdBy: currentUser?.name });
        }
        addCompanyFormRef.current?.resetForm();
    };
    
    const handleEditEntry = (index: number) => setEditingEntry(summaryFields[index]);
    
    const removeEntry = (index: number) => remove(index);

    const handleSavePeriod = async (data: PeriodFormValues) => {
        if (summaryFields.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }
        if (data.hasPartner && Math.abs(totalPartnerPercentage - 100) > 0.01) {
            toast({ title: "خطأ في توزيع حصص الشركاء", description: `مجموع نسب الشركاء يجب أن يكون 100% تمامًا من المبلغ المتاح لهم. المجموع الحالي: ${totalPartnerPercentage.toFixed(2)}%`, variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = summaryFields.map((entry: any) => ({
                ...entry,
                entryDate: format(data.entryDate, 'yyyy-MM-dd'),
                fromDate: format(data.fromDate!, 'yyyy-MM-dd'),
                toDate: format(data.toDate!, 'yyyy-MM-dd'),
                currency: data.currency,
                hasPartner: data.hasPartner,
                alrawdatainSharePercentage: data.alrawdatainSharePercentage,
                partnerShares: (data.partners || []).map(p => ({
                    partnerId: p.partnerId,
                    partnerName: p.partnerName,
                    partnerInvoiceNumber: p.partnerInvoiceNumber,
                    share: (entry.partnerShare * (p.percentage / 100))
                }))
            }));
            
            const result = await addSegmentEntries(finalEntries as any, existingPeriod?.periodId);
            if (!result.success) throw new Error(result.error);
            toast({ title: "تم تحديث بيانات الفترة بنجاح" });
            setOpen(false);
            await onSuccess();
            
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message || "لم يتم حفظ البيانات.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddOrUpdatePartner = async () => {
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

        if (adjustedTotal > 100.01) { // Use tolerance
             toast({ title: "لا يمكن تجاوز 100%", description: `إجمالي النسب الحالية: ${currentTotalPartnerPercentage.toFixed(2)}%`, variant: 'destructive' });
             return;
        }

        const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
        if(!selectedPartner) {
             toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
             return;
        }

        const partnerInvoiceNumber = editingPartnerIndex !== null ? partnerFields[editingPartnerIndex].partnerInvoiceNumber : await getNextVoucherNumber("PARTNER");

        const partnerData = {
            id: editingPartnerIndex !== null ? partnerFields[editingPartnerIndex].id : `new-${Date.now()}`,
            partnerId: selectedPartner.value.split('-')[1] || selectedPartner.value,
            partnerName: selectedPartner.label,
            partnerInvoiceNumber: partnerInvoiceNumber,
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
        setCurrentPartnerId(partnerOptions.find(p => p.value.endsWith(partnerToEdit.partnerId))?.value || '');
        setCurrentPercentage(partnerToEdit.percentage);
    };

    const isDistributionLocked = watchedPeriod.hasPartner && Math.abs(totalPartnerPercentage - 100) > 0.01;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="me-2 h-4 w-4"/> تعديل الفترة
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>تعديل سجل سكمنت</DialogTitle>
                </DialogHeader>
                <FormProvider {...periodForm}>
                    <form onSubmit={handlePeriodSubmit(handleSavePeriod)} className="flex flex-col flex-grow overflow-hidden">
                        <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6 pb-4">
                            <AddCompanyToSegmentForm ref={addCompanyFormRef} onAdd={handleAddOrUpdateEntry} editingEntry={editingEntry} onCancelEdit={() => setEditingEntry(null)} allCompanyOptions={allCompanyOptions} partnerOptions={partnerOptions} />
                            <SummaryList onRemove={removeEntry} onEdit={handleEditEntry} />
                        </div>
                        <DialogFooter className="pt-4 border-t flex-row items-center justify-between sticky bottom-0 bg-background mt-auto">
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <SummaryStat title="إجمالي الربح" value={grandTotalProfit} currency={watchedPeriod.currency} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="submit" disabled={isSaving || summaryFields.length === 0}>
                                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    <Save className="me-2 h-4 w-4" />
                                    تحديث الفترة ({summaryFields.length} سجلات)
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}


    