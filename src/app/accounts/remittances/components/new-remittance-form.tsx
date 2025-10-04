
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Wallet, Hash, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Remittance, Currency, RemittanceSettings, Client, User as CurrentUser, Box } from '@/lib/types';
import { DialogFooter } from '@/components/ui/dialog';
import { Autocomplete } from '@/components/ui/autocomplete';
import { addRemittance } from '@/app/accounts/remittances/actions';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';

const formSchema = z.object({
  companyName: z.string().min(1, "اسم الشركة مطلوب"),
  officeName: z.string().min(1, "اسم المكتب مطلوب"),
  method: z.string().min(1, "طريقة التحويل مطلوبة"),
  assignedToUid: z.string().min(1, "المخول بالاستلام مطلوب"),
  boxId: z.string().min(1, "الصندوق المستلم مطلوب"),
  totalAmountUsd: z.coerce.number().min(0).default(0),
  totalAmountIqd: z.coerce.number().min(0).default(0),
  distributions: z.record(z.coerce.number().min(0)),
  notes: z.string().optional(),
}).refine(data => data.totalAmountUsd > 0 || data.totalAmountIqd > 0, {
  message: "يجب إدخال مبلغ للحوالة إما بالدولار أو بالدينار.",
  path: ["totalAmountUsd"],
});

type FormValues = z.infer<typeof formSchema>;

interface NewRemittanceFormProps {
  settings: RemittanceSettings;
  onRemittanceAdded: (remittance: Remittance) => void;
}

const AmountInput = ({ currency, className, ...props }: { currency: Currency, className?: string } & React.ComponentProps<typeof NumericInput>) => (
     <NumericInput currency={currency} className={cn("text-right", className)} currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} {...props} />
);

export default function NewRemittanceForm({ settings, onRemittanceAdded }: NewRemittanceFormProps) {
  const { toast } = useToast();
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const { user: currentUser } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalAmountUsd: 0,
      totalAmountIqd: 0,
      distributions: {},
      boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
    },
  });

  const { register, formState: { errors, isSubmitting }, setValue } = form;

  const userOptions = useMemo(() => (navData?.users || []).map(u => ({ value: u.uid, label: u.name })), [navData?.users]);
  const boxName = useMemo(() => {
    const boxId = form.watch('boxId');
    return navData?.boxes?.find(b => b.id === boxId)?.name || 'غير محدد';
  }, [form, navData?.boxes]);


  useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId) {
      form.setValue('boxId', currentUser.boxId);
    }
  }, [currentUser, form]);

  const onSubmit = async (data: FormValues) => {
    const payload: Omit<Remittance, 'id' | 'createdAt' | 'createdBy' | 'status' | 'isAudited' | 'updatedAt'> = {
        companyName: data.companyName,
        officeName: data.officeName,
        method: data.method,
        assignedToUid: data.assignedToUid,
        boxId: data.boxId,
        totalAmountUsd: data.totalAmountUsd || 0,
        totalAmountIqd: data.totalAmountIqd || 0,
        distribution: data.distributions,
        notes: data.notes || '',
    };
    
    const result = await addRemittance(payload as any);
    if(result.success && result.newRemittance) {
        toast({title: "تمت إضافة الحوالة بنجاح"});
        onRemittanceAdded(result.newRemittance);
        form.reset();
    } else {
        toast({title: "خطأ", description: result.error, variant: 'destructive'});
    }
  };

  if (!isDataLoaded || !navData) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <Label>الشركة المرسلة</Label>
                        <FormControl>
                            <Autocomplete searchAction='all' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن شركة..." />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="officeName"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <Label>المكتب</Label>
                         <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر المكتب..." /></SelectTrigger></FormControl><SelectContent>{settings.offices.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <Label>طريقة التحويل</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر الطريقة..." /></SelectTrigger></FormControl><SelectContent>{settings.methods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="assignedToUid"
                render={({ field }) => (
                    <FormItem className="space-y-1.5">
                        <Label>المخول بالاستلام</Label>
                         <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر موظفًا..." /></SelectTrigger></FormControl><SelectContent>{userOptions.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="space-y-4 bg-muted/50 p-4 rounded-lg border">
            <h4 className="font-semibold">توزيع مبالغ الحوالة</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>الإجمالي (USD)</Label><Controller control={form.control} name="totalAmountUsd" render={({field}) => <AmountInput currency="USD" {...field} onValueChange={field.onChange} />} /><FormMessage>{errors.totalAmountUsd?.message}</FormMessage></div>
                <div className="space-y-1.5"><Label>الإجمالي (IQD)</Label><Controller control={form.control} name="totalAmountIqd" render={({field}) => <AmountInput currency="IQD" {...field} onValueChange={field.onChange} />} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {settings.distributionColumnsUsd?.map(field => (
                <div key={field.id} className="space-y-1.5">
                <Label>{field.label} (USD)</Label>
                <Controller control={form.control} name={`distributions.${field.id}_usd`} render={({field}) => <AmountInput currency="USD" {...field} onValueChange={field.onChange} />} />
                </div>
            ))}
            {settings.distributionColumnsIqd?.map(field => (
                <div key={field.id} className="space-y-1.5">
                <Label>{field.label} (IQD)</Label>
                <Controller control={form.control} name={`distributions.${field.id}_iqd`} render={({field}) => <AmountInput currency="IQD" {...field} onValueChange={field.onChange} />} />
                </div>
            ))}
            </div>
        </div>
        
        <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea {...register('notes')} /></div>

        <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>الصندوق: {boxName}</span></div>
                <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            <Save className="me-2 h-4 w-4" /> حفظ الحوالة
            </Button>
        </DialogFooter>
        </form>
    </Form>
  );
}

    