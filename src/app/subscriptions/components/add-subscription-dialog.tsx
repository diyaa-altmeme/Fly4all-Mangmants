

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
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Currency, Client, Supplier, Subscription, User, Box } from '@/lib/types';
import { Loader2, Calendar as CalendarIcon, PlusCircle, User as UserIcon, Hash, Wallet, ArrowLeft, ArrowRight, X, Building, Store, Settings2, Save, Trash2 } from 'lucide-react';
import { addSubscription, updateSubscription } from '@/app/subscriptions/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { NumericInput } from '@/components/ui/numeric-input';
import { useAuth } from '@/lib/auth-context';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, parseISO } from 'date-fns';
import { useForm, Controller, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { cn } from '@/lib/utils';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';


const installmentSchema = z.object({
  dueDate: z.date({ required_error: "تاريخ الاستحقاق مطلوب." }),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر."),
});

const formSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().optional(),
  serviceName: z.string().min(2, { message: "اسم الاشتراك مطلوب." }),
  purchaseDate: z.date({ required_error: "تاريخ الشراء مطلوب." }),
  clientId: z.string().min(1, "الرجاء اختيار عميل."),
  currency: z.enum(['USD', 'IQD']),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل.").default(1),
  purchasePrice: z.coerce.number().min(0, "سعر شراء الوحدة يجب ان يكون صفرا أو أكثر.").default(0),
  unitPrice: z.coerce.number().min(0, "سعر بيع الوحدة يجب أن يكون أكبر من صفر").default(0),
  discount: z.coerce.number().min(0, "الخصم لا يمكن أن يكون سالبًا.").default(0).optional(),
  startDate: z.date({ required_error: "تاريخ بدء الاشتراك مطلوب." }),
  installmentMethod: z.enum(['upfront', 'deferred', 'installments']).default('upfront'),
  deferredDueDate: z.date().optional(),
  installments: z.array(installmentSchema).optional(),
  boxId: z.string().optional(),
  notes: z.string().optional(),
  hasPartner: z.boolean().default(false),
  partnerId: z.string().optional(),
  partnerSharePercentage: z.coerce.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddSubscriptionDialogProps {
  onSubscriptionAdded: () => void;
  onSubscriptionUpdated?: (subscription: Subscription) => void;
  isEditing?: boolean;
  initialData?: Subscription;
  children?: React.ReactNode;
}

export default function AddSubscriptionDialog({ 
  onSubscriptionAdded, 
  onSubscriptionUpdated,
  isEditing = false,
  initialData,
  children 
}: AddSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        form.reset({
          ...initialData,
          purchaseDate: parseISO(initialData.purchaseDate),
          startDate: parseISO(initialData.startDate),
          installments: (initialData.installments || []).map(i => ({...i, dueDate: parseISO(i.dueDate)})),
        });
      } else {
         form.reset({
            currency: 'USD',
            purchaseDate: new Date(),
            quantity: 1,
            unitPrice: 0,
            purchasePrice: 0,
            discount: 0,
            startDate: new Date(),
            installmentMethod: 'upfront',
            installments: [],
         });
      }
    }
  }, [open, isEditing, initialData, form]);

  const handleSuccess = (data: any) => {
    if (isEditing && onSubscriptionUpdated) {
        onSubscriptionUpdated(data);
    } else {
        onSubscriptionAdded();
    }
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة اشتراك</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
          <DialogTitle>{isEditing ? `تعديل اشتراك: ${initialData?.serviceName}` : 'إضافة اشتراك جديد'}</DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            {isEditing ? "قم بتحديث تفاصيل الاشتراك." : "أدخل جميع تفاصيل الاشتراك."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-6">
            <NewSubscriptionForm
                isEditing={isEditing}
                initialData={initialData}
                onSuccess={handleSuccess}
                form={form}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keeping NewSubscriptionForm in the same file as it's tightly coupled
// with the dialog's state and logic.

interface NewSubscriptionFormProps {
    isEditing?: boolean;
    initialData?: Subscription;
    onSuccess: (data: any) => void;
    form: ReturnType<typeof useForm<FormValues>>;
}

function NewSubscriptionForm({ isEditing, initialData, onSuccess, form }: NewSubscriptionFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: navData } = useVoucherNav();
  const [isSaving, setIsSaving] = useState(false);
  const [numInstallments, setNumInstallments] = useState(initialData?.numberOfInstallments || 2);
  
  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "installments" });
  
  const watchedCurrency = watch('currency');
  const installmentMethod = watch('installmentMethod');
  const quantity = watch('quantity');
  const purchaseUnitPrice = watch('purchasePrice');
  const saleUnitPrice = watch('unitPrice');
  const discount = watch('discount');
  const installmentsArray = watch('installments');
  const startDate = watch('startDate');
  const hasPartner = watch('hasPartner');
  const partnerSharePercentage = watch('partnerSharePercentage');


  const totalPurchase = (quantity || 0) * (purchaseUnitPrice || 0);
  const totalSale = ((quantity || 0) * (saleUnitPrice || 0)) - (discount || 0);
  const totalProfit = totalSale - totalPurchase;
  
  const partnerShareAmount = (hasPartner && partnerSharePercentage) ? totalProfit * (partnerSharePercentage / 100) : 0;
  const alrawdatainShare = totalProfit - partnerShareAmount;


  const distributedAmount = (installmentsArray || []).reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
  const remainingToDistribute = totalSale - distributedAmount;
  
  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);
  const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: `${c.name} ${c.code ? `(${c.code})` : ''}` })), [navData?.clients]);
   const partnerOptions = React.useMemo(() => {
    if (!navData) return [];
    return [...(navData.clients || []), ...(navData.suppliers || [])].map(p => ({value: p.id, label: p.name}));
  }, [navData]);

  const handleGenerateInstallments = useCallback(() => {
    if (numInstallments > 0 && totalSale > 0) {
      const installmentAmount = parseFloat((totalSale / numInstallments).toFixed(2));
      const newInstallments = Array.from({ length: numInstallments }, (_, i) => {
        const dueDate = addMonths(startDate, i);
        return { dueDate, amount: installmentAmount };
      });
      
      const totalGenerated = newInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      const difference = totalSale - totalGenerated;
      if (newInstallments.length > 0) {
        newInstallments[newInstallments.length - 1].amount += difference;
      }

      replace(newInstallments);
    } else {
      replace([]);
    }
  }, [numInstallments, totalSale, startDate, replace]);


  const onFinalSubmit = async (data: FormValues) => {
    setIsSaving(true);
    if (data.installmentMethod === 'installments' && Math.abs(remainingToDistribute) > 0.01) {
        toast({ title: 'خطأ في التوزيع', description: 'مجموع مبالغ الدفعات لا يساوي إجمالي البيع بعد الخصم.', variant: 'destructive'});
        setIsSaving(false);
        return;
    }

    try {
      const client = navData?.clients?.find(c => c.id === data.clientId);
      const supplier = navData?.suppliers?.find(s => s.id === data.supplierId);

      if (!client) {
          toast({ title: "العميل غير موجود", variant: "destructive" });
          setIsSaving(false);
          return;
      }
      
      const newSubscriptionData = {
        ...data,
        purchaseDate: data.purchaseDate.toISOString(),
        startDate: data.startDate.toISOString(),
        deferredDueDate: data.deferredDueDate ? data.deferredDueDate.toISOString() : undefined,
        installments: (data.installments || []).map(inst => ({ ...inst, dueDate: inst.dueDate.toISOString() })),
        clientName: client.name,
        supplierName: supplier?.name,
      };
      
      let result;
      if (isEditing && initialData) {
        result = await updateSubscription(initialData.id, newSubscriptionData as any);
      } else {
        result = await addSubscription(newSubscriptionData as any);
      }
      
      if (result.success) {
          toast({ title: `تم ${isEditing ? 'تحديث' : 'حفظ'} الاشتراك بنجاح` });
          onSuccess(isEditing ? { ...initialData, ...newSubscriptionData } : result);
      } else {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} subscription`);
      }
    } catch (error: any) {
       toast({
            title: "خطأ",
            description: error.message || `حدث خطأ أثناء ${isEditing ? 'تحديث' : 'إضافة'} الاشتراك.`,
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="المعلومات الأساسية">
                <FormField control={control} name="serviceName" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">اسم الاشتراك / الخدمة</FormLabel><FormControl><Input placeholder="مثال: اشتراك إنترنت شهري" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                        <FormField control={control} name="supplierId" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">المورد (المصدر)</FormLabel><FormControl><Autocomplete searchAction="suppliers" options={supplierOptions} value={field.value} onValueChange={field.onChange} placeholder="اختياري"/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={control} name="clientId" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">العميل (المستفيد)</FormLabel><FormControl><Autocomplete searchAction="clients" options={clientOptions} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل..." /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                    <FormField control={control} name="purchaseDate" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">تاريخ الشراء</FormLabel><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>
                )}/>
            </Section>

            <Section title="التفاصيل المالية وتوزيع الأرباح">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name="quantity" render={({ field }) => (<FormItem><FormLabel className="font-bold">الكمية</FormLabel><FormControl><NumericInput onValueChange={(val) => field.onChange(val || 0)} value={field.value} placeholder="أدخل الكمية" /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={control} name="discount" render={({ field }) => (<FormItem><FormLabel className="font-bold">الخصم</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} placeholder="أدخل الخصم" /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel className="font-bold">الكلفة</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} placeholder="أدخل سعر الشراء" /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel className="font-bold">البيع</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} placeholder="أدخل سعر البيع" /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <Separator className="my-4"/>
                    <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-red-50 p-2 rounded-md"><p className="text-xs font-semibold text-muted-foreground">إجمالي الكلفة</p><p className="font-bold">{totalPurchase.toLocaleString()} {watchedCurrency}</p></div>
                        <div className="bg-blue-50 p-2 rounded-md"><p className="text-xs font-semibold text-muted-foreground">إجمالي المبيع</p><p className="font-bold">{totalSale.toLocaleString()} {watchedCurrency}</p></div>
                        <div className="bg-green-50 p-2 rounded-md"><p className="text-xs font-semibold text-muted-foreground">إجمالي الربح</p><p className="font-bold">{totalProfit.toLocaleString()} {watchedCurrency}</p></div>
                    </div>
                    <FormField control={control} name="hasPartner" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <Label className="font-semibold">هل يوجد شريك في الربح؟</Label>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    {hasPartner && (
                        <div className="grid grid-cols-3 gap-2 text-center p-2 border rounded-lg">
                            <FormField control={control} name="partnerId" render={({field}) => (
                                <FormItem className="col-span-1 text-right space-y-1"><FormLabel className="text-xs">الشريك</FormLabel><FormControl><Autocomplete options={partnerOptions} value={field.value} onValueChange={field.onChange} placeholder="اختر شريك"/></FormControl></FormItem>
                            )}/>
                            <FormField control={control} name="partnerSharePercentage" render={({field}) => (
                                <FormItem className="col-span-2 text-right space-y-1"><FormLabel className="text-xs">حصة الشريك من الربح (%)</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumericInput value={field.value} onValueChange={v => field.onChange(v || 0)} />
                                    <div className="font-bold p-2 rounded-md bg-blue-50 text-blue-800">{partnerShareAmount.toLocaleString()} {watchedCurrency}</div>
                                </div>
                                </FormItem>
                            )}/>
                                <div className="col-span-3 bg-green-50 p-2 rounded-md font-bold text-green-800">حصة الروضتين: {alrawdatainShare.toLocaleString()} {watchedCurrency}</div>
                        </div>
                    )}
                </div>
            </Section>
        </div>

        <DialogFooter className="pt-4 mt-4 border-t">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            <Save className="me-2 h-4 w-4" />
            {isEditing ? 'حفظ التعديلات' : 'حفظ الاشتراك'}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}

