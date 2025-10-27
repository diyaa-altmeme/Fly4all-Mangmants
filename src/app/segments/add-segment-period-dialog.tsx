
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
  PlusCircle, Trash2, Percent, Loader2, Ticket, CreditCard, Hotel, Users as GroupsIcon, ArrowDown, Save, Pencil, Building, User as UserIcon, Wallet, Hash, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FormProvider, useForm, useFieldArray, Controller, useWatch, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Client, Supplier, SegmentSettings, SegmentEntry, PartnerShareSetting, Currency } from '@/lib/types';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAuth } from '@/lib/auth-context';

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
const ServiceLine = ({ label, icon: Icon, color, countField }: any) => {
  const { control, watch } = useFormContext<CompanyEntryFormValues>();
  const count = watch(countField);
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
        const companyData = allCompanyOptions.find(opt => opt.value === data.clientId);
        if (!companyData) return;

        onAdd({ 
            ...data, 
            total, 
            alrawdatainShare, 
            partnerShare, 
            companyName: companyData?.label || '',
            ...companySettings
        });
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
            <CardHeader className="p-3"><CardTitle className="text-base">الشركات المضافة ({summaryEntries.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className='border rounded-lg overflow-hidden'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الشركة</TableHead>
                                <TableHead>إجمالي الربح</TableHead>
                                <TableHead>حصة الروضتين</TableHead>
                                <TableHead>حصة الشركاء</TableHead>
                                <TableHead className='w-[100px] text-center'>الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaryEntries.map((entry, index) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                    <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell>
                                    <TableCell className='text-center'>
                                        <Button type="button" variant="ghost" size="icon" className='h-8 w-8 text-blue-600' onClick={() => onEdit(index)}><Pencil className='h-4 w-4'/></Button>
                                        <Button type="button" variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => remove(index)}><Trash2 className='h-4 w-4'/></Button>
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

// Main Dialog Wrapper
interface AddSegmentPeriodDialogProps { clients: Client[]; suppliers: Supplier[]; onSuccess: () => Promise<void>; isEditing?: boolean; existingPeriod?: any; children?: React.ReactNode; }

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess, isEditing = false, existingPeriod, children }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
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
    const isPeriodDataValid = watch('fromDate') && watch('toDate');
    
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
    
    const currencyOptions = useMemo(() => navData?.settings?.currencySettings?.currencies || [], [navData]);

    useEffect(() => {
        if (open) {
            resetForm({
                fromDate: new Date(), toDate: new Date(), currency: navData?.settings?.currencySettings?.defaultCurrency || 'USD', hasPartner: false,
                alrawdatainSharePercentage: navData?.settings?.segmentSettings?.alrawdatainSharePercentage || 50, partners: [], summaryEntries: []
            });
            setEditingEntry(null);
        }
    }, [open, resetForm, navData]);
    
    const grandTotalProfit = useMemo(() => (summaryFields || []).reduce((sum, e) => sum + (e.total || 0), 0), [summaryFields]);
    const { totalPartnerPercentage, alrawdatainSharePercentage, availableForPartnersPercentage, remainingForPartnersPercentage, alrawdatainShareAmount, amountForPartners, distributedToPartners, remainderForPartners } = useMemo(() => {
        const alrawdatainPerc = Number(watchedPeriod.alrawdatainSharePercentage) || 100;
        const availablePerc = 100 - alrawdatainPerc;
        const partnerPerc = (watchedPeriod.partners || []).reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
        const alrawdatainAmount = grandTotalProfit * (alrawdatainPerc / 100);
        const availableAmount = grandTotalProfit - alrawdatainAmount;
        const distributedAmount = (watchedPeriod.partners || []).reduce((acc, p) => acc + ((availableAmount * (p.percentage || 0)) / 100), 0);

        return { 
            totalPartnerPercentage: partnerPerc, 
            alrawdatainSharePercentage: alrawdatainPerc,
            availableForPartnersPercentage: availablePerc,
            remainingForPartnersPercentage: 100 - partnerPerc,
            alrawdatainShareAmount: alrawdatainAmount,
            amountForPartners: availableAmount,
            distributedToPartners: distributedAmount,
            remainderForPartners: availableAmount - distributedAmount,
        };
    }, [grandTotalProfit, watchedPeriod.alrawdatainSharePercentage, watchedPeriod.partners]);
    
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
            append({ ...entryData, id: uuidv4() });
        }
        addCompanyFormRef.current?.resetForm();
    };
    
    const handleEditEntry = (index: number) => setEditingEntry(summaryFields[index]);
    
    const handleEditPartner = (index: number) => {
        const partnerToEdit = partnerFields[index];
        setEditingPartnerIndex(index);
        setCurrentPartnerId(partnerToEdit.partnerId);
        setCurrentPercentage(partnerToEdit.percentage);
    };
    
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
                fromDate: format(data.fromDate!, 'yyyy-MM-dd'),
                toDate: format(data.toDate!, 'yyyy-MM-dd'),
                currency: data.currency,
                hasPartner: data.hasPartner,
                alrawdatainSharePercentage: data.alrawdatainSharePercentage,
                partnerShares: (data.partners || []).map(p => ({
                    partnerId: p.partnerId,
                    partnerName: p.partnerName,
                    share: (entry.partnerShare * (p.percentage / 100)),
                }))
            }));
            const result = await addSegmentEntries(finalEntries as any, isEditing ? existingPeriod?.periodId : undefined);
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

        if (adjustedTotal > 100.01) { // Use tolerance
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

    const isDistributionLocked = watchedPeriod.hasPartner && Math.abs(totalPartnerPercentage - 100) > 0.01;
    
    const boxName = useMemo(() => {
        if (!currentUser || !('role' in currentUser) || !currentUser.boxId) return 'غير محدد';
        return navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد';
    }, [currentUser, navData?.boxes]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل سجل سكمنت' : 'إضافة سجل سكمنت جديد'}</DialogTitle>
                </DialogHeader>
                
                <FormProvider {...periodForm}>
                    <form onSubmit={handlePeriodSubmit(handleSavePeriod)} className="flex flex-col flex-grow overflow-hidden">
                        <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6 pb-4">
                            {/* All form content */}
                        </div>
                        <DialogFooter className="p-4 border-t flex-row items-center justify-between sticky bottom-0 bg-background mt-auto">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4"/> <span>{currentUser?.name || '...'}</span></div>
                                <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>{boxName}</span></div>
                                <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="submit" disabled={isSaving || summaryFields.length === 0 || isDistributionLocked}>
                                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    {isEditing ? 'حفظ التعديلات' : `حفظ بيانات الفترة (${summaryFields.length} سجل)`}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

const SummaryStat = ({ title, value, currency, className }: { title: string; value: number; currency?: Currency; className?: string; }) => (
    <div className={cn("p-2 text-center rounded-md border", className)}>
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        <p className="font-mono font-bold text-sm">{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</p>
    </div>
);

    