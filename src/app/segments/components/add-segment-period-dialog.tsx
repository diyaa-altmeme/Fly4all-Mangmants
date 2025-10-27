
"use client";

import React, { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
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
import { FormProvider, useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
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
  notes: z.string().optional(),
});

type CompanyEntryFormValues = z.infer<typeof companyEntrySchema>;

// Helpers
function computeService(count: number, type: "fixed" | "percentage", value: number): number {
  if (!count || !value) return 0;
  return type === "fixed" ? count * value : count * (value / 100);
}

function computeCompanyTotal(d: any, companySettings: any) {
  if (!d) return 0;
  const settings = companySettings || {};
  return [
    computeService(d.tickets, settings.ticketProfitType || 'percentage', settings.ticketProfitValue || 50),
    computeService(d.visas, settings.visaProfitType || 'percentage', settings.visaProfitValue || 100),
    computeService(d.hotels, settings.hotelProfitType || 'percentage', settings.hotelProfitValue || 100),
    computeService(d.groups, settings.groupProfitType || 'percentage', settings.groupProfitValue || 100)
  ].reduce((sum, val) => sum + val, 0);
}

// Sub-components
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
      </CardContent>
    </Card>
  );
};

interface AddCompanyToSegmentFormProps {
    onAdd: (data: any) => void;
    allCompanyOptions: { value: string; label: string; settings?: any }[];
    partnerOptions: { value: string; label: string }[];
    editingEntry?: any;
    onCancelEdit: () => void;
}

const AddCompanyToSegmentForm = forwardRef(({ onAdd, allCompanyOptions, partnerOptions, editingEntry, onCancelEdit }: AddCompanyToSegmentFormProps, ref) => {
    const form = useForm<CompanyEntryFormValues>({
        resolver: zodResolver(companyEntrySchema),
    });

    useEffect(() => {
        form.reset(editingEntry || { id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
    }, [editingEntry, form]);

    useImperativeHandle(ref, () => ({ resetForm: () => form.reset() }), [form]);

    const { control, handleSubmit, watch, setValue } = form;
    const currentClientId = watch('clientId');

    useEffect(() => {
        if (!currentClientId) return;
        const client = allCompanyOptions.find(c => c.value === currentClientId);
        if (client?.settings) {
            Object.keys(client.settings).forEach(key => {
                setValue(key as any, client.settings[key]);
            });
        }
    }, [currentClientId, setValue, allCompanyOptions]);

    const handleAddClick = (data: CompanyEntryFormValues) => {
        const client = allCompanyOptions.find(c => c.value === data.clientId);
        onAdd({ ...data, companyName: client?.label || '' });
        form.reset({ id: uuidv4(), clientId: "", clientName: "", tickets: 0, visas: 0, hotels: 0, groups: 0, notes: "" });
        onCancelEdit();
    };
    
    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleAddClick)} className="space-y-3">
                {/* Form fields here */}
            </form>
        </FormProvider>
    );
});
AddCompanyToSegmentForm.displayName = "AddCompanyToSegmentForm";

// Main Dialog Component
interface AddSegmentPeriodDialogProps { clients: Client[]; suppliers: Supplier[]; onSuccess: () => Promise<void>; isEditing?: boolean; existingPeriod?: any; children?: React.ReactNode; }

export default function AddSegmentPeriodDialog({ clients, suppliers, onSuccess, isEditing = false, existingPeriod, children }: AddSegmentPeriodDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [periodEntries, setPeriodEntries] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const addCompanyFormRef = React.useRef<{ resetForm: () => void }>(null);
    const [editingEntry, setEditingEntry] = useState<any | null>(null);

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

    const handleAddOrUpdateEntry = (entryData: any) => {
        if (editingEntry) {
            setPeriodEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, ...entryData, id: e.id } : e));
            setEditingEntry(null);
        } else {
            setPeriodEntries(prev => [...prev, { ...entryData, id: uuidv4() }]);
        }
        addCompanyFormRef.current?.resetForm();
    };

    const handleEditEntry = (entry: any) => {
        setEditingEntry(entry);
    };

    const removeEntry = (id: string) => {
        setPeriodEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleSavePeriod = async () => {
        // ... (save logic)
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>{isEditing ? 'تعديل سجل سكمنت' : 'إضافة سجل سكمنت جديد'}</DialogTitle></DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6 space-y-6">
                    <AddCompanyToSegmentForm 
                        ref={addCompanyFormRef}
                        onAdd={handleAddOrUpdateEntry}
                        editingEntry={editingEntry}
                        onCancelEdit={() => setEditingEntry(null)}
                        allCompanyOptions={allCompanyOptions}
                        partnerOptions={partnerOptions}
                    />
                </div>
                <DialogFooter><Button onClick={handleSavePeriod} disabled={isSaving}>حفظ الفترة</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
