
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Percent, Settings2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { SegmentEntry, SegmentSettings, Client, Supplier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addSegmentEntries } from '@/app/segments/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NumericInput } from '@/components/ui/numeric-input';

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
  partnerId: z.string().min(1, { message: "اسم الشريك مطلوب." }),
  tickets: z.coerce.number().int().nonnegative().default(0),
  visas: z.coerce.number().int().nonnegative().default(0),
  hotels: z.coerce.number().int().nonnegative().default(0),
  groups: z.coerce.number().int().nonnegative().default(0),
  ticketProfitPercentage: z.coerce.number().min(0).max(100).default(50),
  visaProfitPercentage: z.coerce.number().min(0).max(100).default(100),
  hotelProfitPercentage: z.coerce.number().min(0).max(100).default(100),
  groupProfitPercentage: z.coerce.number().min(0).max(100).default(100),
  alrawdatainSharePercentage: z.coerce.number().min(0).max(100).default(50),
});

const InputWithPercentage = ({ field, ...props }: { field: any } & React.ComponentProps<typeof Input>) => (
    <div className="relative">
      <Input type="number" {...field} className="pe-7" {...props} />
      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
);

const PairedInput = ({
    form,
    name,
    percentageName,
    placeholder,
    borderColorClass
}: {
    form: ReturnType<typeof useForm<CompanyEntryFormValues>>;
    name: keyof CompanyEntryFormValues;
    percentageName: keyof CompanyEntryFormValues;
    placeholder: string;
    borderColorClass: string;
}) => (
    <div className="space-y-1">
        <div className={cn("flex rounded-lg border overflow-hidden focus-within:ring-2 focus-within:ring-ring", borderColorClass)}>
            <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                            <NumericInput {...field} placeholder={placeholder} className="h-9 border-0 rounded-none text-center" />
                        </FormControl>
                    </FormItem>
                )}
            />
             <CollapsibleContent asChild>
                <FormField
                    control={form.control}
                    name={percentageName}
                    render={({ field }) => (
                         <FormItem className="w-20 border-r">
                             <FormControl>
                                <InputWithPercentage field={field} className="h-9 border-0 rounded-none text-center"/>
                             </FormControl>
                         </FormItem>
                    )}
                />
            </CollapsibleContent>
        </div>
    </div>
);


type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<Omit<SegmentEntry, 'id' | 'fromDate' | 'toDate'>[]>([]);
    
    const allCompanyOptions = useMemo(() => {
        return clients.filter(c => c.type === 'company').map(c => ({ value: c.id, label: c.name }));
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


    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '',
            partnerId: '',
            tickets: 0,
            visas: 0,
            hotels: 0,
            groups: 0,
            ticketProfitPercentage: 50,
            visaProfitPercentage: 100,
            hotelProfitPercentage: 100,
            groupProfitPercentage: 100,
            alrawdatainSharePercentage: 50,
        }
    });

    const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
    const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);


    useEffect(() => {
        if (open) {
             periodForm.reset({});
             companyForm.reset({
                clientId: '',
                partnerId: '',
                tickets: 0,
                visas: 0,
                hotels: 0,
                groups: 0,
                ticketProfitPercentage: 50,
                visaProfitPercentage: 100,
                hotelProfitPercentage: 100,
                groupProfitPercentage: 100,
                alrawdatainSharePercentage: 50,
            });
            setPeriodEntries([]);
        }
    }, [open, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues) => {
        const { ticketProfitPercentage, visaProfitPercentage, hotelProfitPercentage, groupProfitPercentage, alrawdatainSharePercentage, ...rest } = data;

        const ticketProfits = data.tickets * (ticketProfitPercentage / 100);
        const visaProfits = data.visas * (visaProfitPercentage / 100);
        const hotelProfits = data.hotels * (hotelProfitPercentage / 100);
        const groupProfits = data.groups * (groupProfitPercentage / 100);
        const otherProfits = visaProfits + hotelProfits + groupProfits;
        const total = ticketProfits + otherProfits;
        const alrawdatainShare = total * (alrawdatainSharePercentage / 100);
        const partnerShare = total - alrawdatainShare;
        
        const client = clients.find(c => c.id === data.clientId);
        const selectedPartnerOption = partnerOptions.find(p => p.value === data.partnerId);

        return { 
            ...rest,
            companyName: client?.name || '',
            clientId: client?.id || '',
            partnerId: selectedPartnerOption?.value.split('-')[1] || '',
            partnerName: selectedPartnerOption?.label || '',
            ticketProfits, 
            otherProfits, 
            total, 
            alrawdatainShare, 
            partnerShare,
            // Store the settings used for this calculation
            ticketProfitPercentage, visaProfitPercentage, hotelProfitPercentage, groupProfitPercentage, alrawdatainSharePercentage
        };
    }

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const newEntry = calculateShares(data, company?.segmentSettings);
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({ 
            clientId: '', partnerId: '', tickets: 0, visas: 0, hotels: 0, groups: 0,
            ticketProfitPercentage: 50, visaProfitPercentage: 100, hotelProfitPercentage: 100, groupProfitPercentage: 100, alrawdatainSharePercentage: 50,
        });
    };

    const removeEntry = (index: number) => {
        setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    }

    const handleSavePeriod = async () => {
        const periodData = await periodForm.trigger() ? periodForm.getValues() : null;
        if (!periodData || !periodData.fromDate || !periodData.toDate) {
            toast({ title: "بيانات الفترة غير كاملة", description: "الرجاء تحديد تاريخ البدء والانتهاء.", variant: "destructive" });
            return;
        }

        if (periodEntries.length === 0) {
            toast({ title: "لا توجد سجلات للحفظ", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalEntries = periodEntries.map((entry) => ({
                ...entry,
                fromDate: format(periodData.fromDate!, 'yyyy-MM-dd'),
                toDate: format(periodData.toDate!, 'yyyy-MM-dd'),
            }));
            
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
                 <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل الفترة، ثم أضف بيانات الشركات، واحفظ السجل.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    <div className="p-4 border rounded-lg bg-background/50">
                        <Form {...periodForm}>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <FormField control={periodForm.control} name="fromDate" render={({ field }) => (
                                    <FormItem><Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>من تاريخ</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsFromCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                <FormField control={periodForm.control} name="toDate" render={({ field }) => (
                                    <FormItem><Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "yyyy-MM-dd") : <span>إلى تاريخ</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d); setIsToCalendarOpen(false);}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                            </form>
                        </Form>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <Form {...companyForm}>
                           <Collapsible asChild>
                            <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={companyForm.control} name="clientId" render={({ field }) => (
                                        <FormItem><FormControl><Autocomplete options={allCompanyOptions} value={field.value} onValueChange={field.onChange} placeholder="الشركة المصدرة للسكمنت"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={companyForm.control} name="partnerId" render={({ field }) => (
                                        <FormItem><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="الشريك"/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                     <PairedInput form={companyForm} name="tickets" percentageName="ticketProfitPercentage" placeholder="التذاكر" borderColorClass="border-blue-500/50 focus-within:ring-blue-500/50" />
                                     <PairedInput form={companyForm} name="visas" percentageName="visaProfitPercentage" placeholder="الفيزا" borderColorClass="border-green-500/50 focus-within:ring-green-500/50" />
                                     <PairedInput form={companyForm} name="hotels" percentageName="hotelProfitPercentage" placeholder="الفنادق" borderColorClass="border-orange-500/50 focus-within:ring-orange-500/50" />
                                     <PairedInput form={companyForm} name="groups" percentageName="groupProfitPercentage" placeholder="الكروبات" borderColorClass="border-purple-500/50 focus-within:ring-purple-500/50" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <CollapsibleTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            <Settings2 className="me-2 h-4 w-4"/>
                                            إعدادات العمولة
                                        </Button>
                                    </CollapsibleTrigger>

                                     <FormField control={companyForm.control} name="alrawdatainSharePercentage" render={({ field }) => (
                                        <FormItem className="w-48">
                                            <div className="relative">
                                                <FormControl><InputWithPercentage field={field} className="h-9" placeholder="حصة الروضتين"/></FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>

                                    <Button type="submit"><PlusCircle className='me-2 h-4 w-4' /> إضافة للفترة</Button>
                                </div>
                            </form>
                           </Collapsible>
                        </Form>
                    </div>
                    
                    <div className='p-4 border rounded-lg'>
                        <h3 className="font-semibold text-base mb-2">الشركات المضافة ({periodEntries.length})</h3>
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
                                    {periodEntries.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24">ابدأ بإضافة الشركات في النموذج أعلاه.</TableCell></TableRow>
                                    ) : periodEntries.map((entry, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-semibold">{entry.companyName}</TableCell>
                                            <TableCell>{entry.partnerName}</TableCell>
                                            <TableCell className="font-mono">{entry.total.toFixed(2)}</TableCell>
                                            <TableCell className="font-mono text-green-600">{entry.alrawdatainShare.toFixed(2)}</TableCell>
                                            <TableCell className="font-mono text-blue-600">{entry.partnerShare.toFixed(2)}</TableCell>
                                            <TableCell className='text-center'>
                                                <Button variant="ghost" size="icon" className='h-8 w-8 text-destructive' onClick={() => removeEntry(index)}><Trash2 className='h-4 w-4'/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            
                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <div className="flex justify-between w-full">
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button type="button" onClick={handleSavePeriod} disabled={isSaving || periodEntries.length === 0} className="sm:w-auto">
                            {isSaving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                            حفظ بيانات الفترة ({periodEntries.length} سجلات)
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    