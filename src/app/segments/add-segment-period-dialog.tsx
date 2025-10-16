
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Percent, Settings2, HandCoins, ChevronDown, BadgeCent, DollarSign, User as UserIcon, Wallet, Hash, CheckCircle, ArrowRight, X, Building, Store } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier, Currency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/lib/auth-context';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { NumericInput } from '@/components/ui/numeric-input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

const partnerSchema = z.object({
  id: z.string().min(1, "اسم الشريك مطلوب."),
  name: z.string(),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
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

const formSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
  boxId: z.string().min(1, "الصندوق مطلوب"),
  officerId: z.string().min(1, "الموظف مطلوب"),
  currency: z.enum(['USD', 'IQD']).default('USD'),
  entries: z.array(companyEntrySchema).min(1, "يجب إضافة شركة واحدة على الأقل."),
});


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof formSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface AddSegmentPeriodDialogProps {
  onSuccess: () => Promise<void>;
  children: React.ReactNode;
}

const ServiceCard = ({ name, countFieldName, typeFieldName, valueFieldName }: {
    name: string,
    countFieldName: keyof CompanyEntryFormValues,
    typeFieldName: keyof CompanyEntryFormValues,
    valueFieldName: keyof CompanyEntryFormValues
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
             <FormField control={control} name={countFieldName} render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="العدد" {...field} className="text-center font-bold text-lg h-10" /></FormControl></FormItem>)} />
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
                             <NumericInput {...field} onValueChange={field.onChange} className="h-8"/>
                        )}
                     />
                </div>
            </CollapsibleContent>
        </div>
    )
}

function AddCompanyToSegmentForm({ allCompanyOptions, partnerOptions, onAddEntry }: { allCompanyOptions: any[], partnerOptions: any[], onAddEntry: (data: any) => void }) {
    const { control, watch, setValue, handleSubmit, formState } = useFormContext<CompanyEntryFormValues>();

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

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'partners'
    });
    
    const [currentPartnerId, setCurrentPartnerId] = useState('');
    const [currentPartnerValue, setCurrentPartnerValue] = useState<number | ''>('');
    const [currentPartnerType, setCurrentPartnerType] = useState<'percentage' | 'fixed'>('percentage');

    const handleAddPartner = () => {
        if (!currentPartnerId || currentPartnerValue === '') {
            toast({ title: "الرجاء تحديد الشريك والنسبة", variant: 'destructive' });
            return;
        }
        const newPercentage = Number(currentPartnerValue);
        if (isNaN(newPercentage) || newPercentage <= 0) {
            toast({ title: "القيمة يجب أن تكون رقمًا موجبًا", variant: 'destructive' });
            return;
        }

        const selectedPartner = partnerOptions.find(p => p.value === currentPartnerId);
        if(!selectedPartner) {
           toast({ title: "الشريك المختار غير صالح", variant: 'destructive' });
           return;
        }
        const newPartner = { id: selectedPartner.id, name: selectedPartner.name, type: currentPartnerType, value: newPercentage, notes: '' };
        append(newPartner);
        setCurrentPartnerId('');
        setCurrentPartnerValue('');
    };

    const { toast } = useToast();

    return (
        <form onSubmit={handleSubmit(onAddEntry)} className="space-y-4">
             <FormField control={control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>الشركة المصدرة للسكمنت</FormLabel><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..."/></FormControl><FormMessage /></FormItem>
            )} />
            
             <Collapsible>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {(['tickets', 'visas', 'hotels', 'groups'] as const).map((item, index) => (
                        <ServiceCard
                            key={item}
                            name={['التذاكر', 'الفيزا', 'الفنادق', 'الكروبات'][index]}
                            countFieldName={item}
                            typeFieldName={`${item}ProfitType`}
                            valueFieldName={`${item}ProfitValue`}
                        />
                     ))}
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
                                <NumericInput {...field} onValueChange={field.onChange} placeholder="50"/>
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
                     <div className="flex items-end gap-2">
                        <div className="flex-grow"><Label>الشريك</Label><Autocomplete options={partnerOptions} value={currentPartnerId} onValueChange={setCurrentPartnerId} placeholder="اختر شريك..."/></div>
                        <div className="w-24"><Label>النوع</Label><Select value={currentPartnerType} onValueChange={(v: any) => setCurrentPartnerType(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة</SelectItem><SelectItem value="fixed">مبلغ</SelectItem></SelectContent></Select></div>
                        <div className="w-28"><Label>القيمة</Label><Input type="number" value={currentPartnerValue} onChange={(e) => setCurrentPartnerValue(Number(e.target.value))} /></div>
                        <Button type="button" size="icon" className="shrink-0" onClick={handleAddPartner}><PlusCircle className="h-4 w-4"/></Button>
                     </div>
                     {fields.length > 0 && (
                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded-md">
                                    <span className="font-semibold flex-grow">{watch(`partners.${index}.name`)}</span>
                                    <Badge variant="secondary">{watch(`partners.${index}.value`)} {watch(`partners.${index}.type`) === 'percentage' ? '%' : '$'}</Badge>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            )}
             <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className='flex justify-end'>
                <Button type="submit"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
            </div>
        </form>
    );
}

export default function AddSegmentPeriodDialog({ onSuccess, children }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
    const { user: currentUser } = useAuth();

    const form = useForm<PeriodFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fromDate: new Date(),
            toDate: new Date(),
            boxId: '',
            officerId: '',
            currency: 'USD',
            entries: [],
        },
    });

    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '', hasPartner: false, partners: [], distributionType: 'percentage', tickets: 0, visas: 0, hotels: 0, groups: 0, notes: '',
            ticketProfitType: 'percentage', ticketProfitValue: 50,
            visaProfitType: 'percentage', visaProfitValue: 100,
            hotelProfitType: 'percentage', hotelProfitValue: 100,
            groupProfitType: 'percentage', groupProfitValue: 100,
            alrawdatainSharePercentage: 50,
        }
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "entries" });

    useEffect(() => {
        if (open && !navLoaded) {
            fetchData();
        } else if (open && navLoaded && currentUser && 'uid' in currentUser) {
            form.reset({
                fromDate: new Date(),
                toDate: new Date(),
                boxId: (currentUser as any).boxId || '',
                officerId: currentUser.uid,
                currency: 'USD',
                entries: [],
            });
            companyForm.reset();
        }
    }, [open, navLoaded, currentUser, fetchData, form, companyForm]);

    const allCompanyOptions = useMemo(() => (navData?.clients || []).filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name, settings: c.segmentSettings })), [navData?.clients]);
    const partnerOptions = useMemo(() => {
        const allRelations = [...(navData?.clients || []), ...(navData?.suppliers || [])];
        const uniqueRelations = Array.from(new Map(allRelations.map(item => [item.id, item])).values());
        return uniqueRelations.map(r => ({ value: r.id, label: `${r.relationType === 'client' ? 'عميل' : 'مورد'}: ${r.name}` }));
    }, [navData?.clients, navData?.suppliers]);

    const calculateShares = useCallback((data: CompanyEntryFormValues) => {
        const company = (navData?.clients || []).find(c => c.id === data.clientId);
        const settings = company?.segmentSettings || data;

        const getProfit = (count: number, type: 'percentage' | 'fixed', value: number) => (type === 'percentage') ? count * (value / 100) : count * value;
        const ticketProfits = getProfit(data.tickets, settings.ticketProfitType, settings.ticketProfitValue);
        const otherProfits = getProfit(data.visas, settings.visaProfitType, settings.visaProfitValue) + getProfit(data.hotels, settings.hotelProfitType, settings.hotelProfitValue) + getProfit(data.groups, settings.groupProfitType, settings.groupProfitValue);
        const total = ticketProfits + otherProfits;
        const alrawdatainShare = total * ((settings.alrawdatainSharePercentage || 50) / 100);
        let partnerTotalShare = 0;
        const partnerSharesDetails: { partnerId: string; partnerName: string; share: number }[] = [];

        if (data.hasPartner && data.partners) {
            const remainingForPartners = total - alrawdatainShare;
            if (data.distributionType === 'percentage') {
                data.partners.forEach(p => {
                    const amount = remainingForPartners * (p.value / 100);
                    partnerSharesDetails.push({ partnerId: p.id, partnerName: p.name, share: amount });
                    partnerTotalShare += amount;
                });
            } else {
                data.partners.forEach(p => {
                    partnerSharesDetails.push({ partnerId: p.id, partnerName: p.name, share: p.value });
                    partnerTotalShare += p.value;
                });
            }
        } else {
            partnerTotalShare = total - alrawdatainShare;
        }

        return { ...data, companyName: company?.name || '', ticketProfits, otherProfits, total, alrawdatainShare, partnerShare: partnerTotalShare, partnerShares: partnerSharesDetails };
    }, [navData?.clients]);

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const newEntry = calculateShares(data);
        append(newEntry);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset();
    };
    
    const removeEntry = (index: number) => {
        remove(index);
    };
    
    const handleSavePeriod = async (data: PeriodFormValues) => {
        if (data.entries.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = data.entries.map((entry) => ({ ...entry, fromDate: format(data.fromDate!, 'yyyy-MM-dd'), toDate: format(data.toDate!, 'yyyy-MM-dd'), currency: data.currency, boxId: data.boxId, officerId: data.officerId }));
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
            <DialogTrigger asChild>
                 {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>أدخل بيانات الفترة المحاسبية، ثم أضف سجلات الشركات.</DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSavePeriod)} className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                        <div className="p-4 border rounded-lg bg-background/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <FormField control={form.control} name="fromDate" render={({ field }) => <FormItem><FormLabel>من تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                            <FormField control={form.control} name="toDate" render={({ field }) => <FormItem><FormLabel>إلى تاريخ</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>} />
                             <FormField control={form.control} name="officerId" render={({ field }) => (<FormItem><FormLabel>الموظف</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{(navData?.users || []).map(u => <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="boxId" render={({ field }) => (<FormItem><FormLabel>الصندوق</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{(navData?.boxes || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold text-base mb-2">إضافة شركة جديدة</h3>
                            <FormProvider {...companyForm}>
                               <AddCompanyToSegmentForm 
                                 allCompanyOptions={allCompanyOptions} 
                                 partnerOptions={partnerOptions} 
                                 onAddEntry={handleAddCompanyEntry}
                               />
                            </FormProvider>
                        </div>
                        
                        <div className='p-4 border rounded-lg'>
                            <h3 className="font-semibold text-base mb-2">الشركات المضافة ({fields.length})</h3>
                            <div className='border rounded-lg overflow-hidden'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الشركة</TableHead>
                                            <TableHead>الشريك</TableHead>
                                            <TableHead>إجمالي الربح</TableHead>
                                            <TableHead>حصة الروضتين</TableHead>
                                            <TableHead>حصة الشريك</TableHead>
                                            <TableHead className='w-[60px] text-center'>حذف</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                        ) : fields.map((entry, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-semibold">{form.watch(`entries.${index}.companyName`)}</TableCell>
                                                <TableCell>{form.watch(`entries.${index}.partnerName`)}</TableCell>
                                                <TableCell className="font-mono">{form.watch(`entries.${index}.total`)?.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-green-600">{form.watch(`entries.${index}.alrawdatainShare`)?.toFixed(2)}</TableCell>
                                                <TableCell className="font-mono text-blue-600">{form.watch(`entries.${index}.partnerShare`)?.toFixed(2)}</TableCell>
                                                <TableCell className='text-center'>
                                                    <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => remove(index)}><Trash2 className='h-4 w-4'/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t flex-shrink-0">
                            <Button type="submit" disabled={isSaving || fields.length === 0} className="w-full sm:w-auto">
                                {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                حفظ بيانات الفترة ({fields.length} سجلات)
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

    