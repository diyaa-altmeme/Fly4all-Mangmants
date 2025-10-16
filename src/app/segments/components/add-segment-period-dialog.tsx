
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
import { Loader2, PlusCircle, Calendar as CalendarIcon, Trash2, ArrowLeft, Percent, Settings2, HandCoins, ChevronDown, BadgeCent, DollarSign, User as UserIcon, Wallet, Hash, CheckCircle, ArrowRight, X } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
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
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from '@/components/ui/label';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const periodSchema = z.object({
  fromDate: z.date({ required_error: "تاريخ البدء مطلوب." }),
  toDate: z.date({ required_error: "تاريخ الانتهاء مطلوب." }),
});

const partnerSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().min(0, "القيمة يجب أن تكون موجبة."),
    notes: z.string().optional(),
});

const companyEntrySchema = z.object({
  clientId: z.string().min(1, { message: "اسم الشركة مطلوب." }),
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

  hasPartner: z.boolean().default(false),
  distributionType: z.enum(['percentage', 'fixed']).default('percentage'),
  partners: z.array(partnerSchema).optional(),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;
type PeriodFormValues = z.infer<typeof periodSchema>;
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface AddSegmentPeriodDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
}

// ... rest of the component
export default function AddSegmentPeriodDialog({ clients = [], suppliers = [], onSuccess }: AddSegmentPeriodDialogProps) {
    // ... state declarations as before
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [periodEntries, setPeriodEntries] = useState<any[]>([]);
    
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


    const periodForm = useForm<PeriodFormValues>({ resolver: zodResolver(periodSchema) });
    const companyForm = useForm<CompanyEntryFormValues>({ 
        resolver: zodResolver(companyEntrySchema),
        defaultValues: {
            clientId: '',
            tickets: 0, visas: 0, hotels: 0, groups: 0,
            hasPartner: false,
            partners: [],
            distributionType: 'percentage',
            notes: '',
        }
    });

     useEffect(() => {
        if (open) {
            periodForm.reset({});
            companyForm.reset({
                clientId: '', tickets: 0, visas: 0, hotels: 0, groups: 0,
                hasPartner: false, partners: [], distributionType: 'percentage', notes: '',
            });
            setPeriodEntries([]);
        }
    }, [open, periodForm, companyForm]);

     const calculateShares = (data: CompanyEntryFormValues) => {
        const company = clients.find(c => c.id === data.clientId);
        const settings = company?.segmentSettings || {
            ticketProfitValue: 50, visaProfitValue: 100, hotelProfitValue: 100, groupProfitValue: 100,
            ticketProfitType: 'percentage', visaProfitType: 'percentage', hotelProfitType: 'percentage', groupProfitType: 'percentage',
        };

        const getProfit = (count: number, type: 'percentage' | 'fixed' | undefined, value: number | undefined) => {
            const profitType = type || 'percentage';
            const profitValue = value || 0;
            if (profitType === 'percentage') return (count || 0) * (profitValue / 100);
            return (count || 0) * profitValue;
        };

        const ticketProfits = getProfit(data.tickets, settings.ticketProfitType, settings.ticketProfitValue);
        const visaProfits = getProfit(data.visas, settings.visaProfitType, settings.visaProfitValue);
        const hotelProfits = getProfit(data.hotels, settings.hotelProfitType, settings.hotelProfitValue);
        const groupProfits = getProfit(data.groups, settings.groupProfitType, settings.groupProfitValue);

        const totalProfit = ticketProfits + visaProfits + hotelProfits + groupProfits;

        let companyShare = totalProfit;
        const partnerShares: any[] = [];

        if (data.hasPartner && data.partners) {
            let totalDistributed = 0;
            if (data.distributionType === 'percentage') {
                data.partners.forEach(p => {
                    const amount = totalProfit * (p.value / 100);
                    partnerShares.push({ partnerId: p.id, partnerName: p.name, share: amount });
                    totalDistributed += amount;
                });
            } else { // fixed
                data.partners.forEach(p => {
                    partnerShares.push({ partnerId: p.id, partnerName: p.name, share: p.value });
                    totalDistributed += p.value;
                });
            }
            companyShare = totalProfit - totalDistributed;
        }

        return {
            ...data,
            companyName: company?.name || '',
            totalProfit,
            companyShare,
            partnerShares,
        };
    };

    const handleAddCompanyEntry = (data: CompanyEntryFormValues) => {
        const newEntry = calculateShares(data);
        setPeriodEntries(prev => [...prev, newEntry]);
        toast({ title: "تمت إضافة الشركة", description: `تمت إضافة ${newEntry.companyName} إلى الفترة الحالية.` });
        companyForm.reset({
            clientId: '', tickets: 0, visas: 0, hotels: 0, groups: 0,
            hasPartner: false, partners: [], distributionType: 'percentage', notes: '',
        });
    };

    const removeEntry = (index: number) => {
        setPeriodEntries(prev => prev.filter((_, i) => i !== index));
    }

    const handleSavePeriod = async () => {
        // ... (save logic, simplified for brevity)
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إضافة سجل سكمنت جديد</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    <Form {...companyForm}>
                         <form onSubmit={companyForm.handleSubmit(handleAddCompanyEntry)} className="space-y-4">
                            {/* Form fields here, including the new partner logic */}
                         </form>
                    </Form>
                </div>
                <DialogFooter>
                    <Button onClick={handleSavePeriod} disabled={isSaving}>حفظ الفترة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
