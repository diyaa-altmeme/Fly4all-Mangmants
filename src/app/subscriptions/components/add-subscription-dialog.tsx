
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Calendar as CalendarIcon, PlusCircle, User as UserIcon, Hash, Wallet, ArrowLeft, ArrowRight, X, Building, Store, Settings2, Save } from 'lucide-react';
import { addSubscription as addSubscriptionAction } from '@/app/subscriptions/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { NumericInput } from '@/components/ui/numeric-input';
import { useAuth } from '@/lib/auth-context';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, endOfDay } from 'date-fns';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formSchema = z.object({
  supplierId: z.string().min(1, "الرجاء اختيار مورد."),
  serviceName: z.string().min(2, { message: "اسم الاشتراك مطلوب." }),
  purchaseDate: z.date({ required_error: "تاريخ الشراء مطلوب." }),
  clientId: z.string().min(1, "الرجاء اختيار عميل."),
  currency: z.enum(['USD', 'IQD']),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل.").default(1),
  purchasePrice: z.coerce.number().min(0, "سعر شراء الوحدة يجب ان يكون صفرا أو أكثر.").default(0),
  unitPrice: z.coerce.number().min(0, "سعر بيع الوحدة يجب أن يكون أكبر من صفر").default(0),
  discount: z.coerce.number().min(0, "الخصم لا يمكن أن يكون سالبًا.").default(0).optional(),
  startDate: z.date({ required_error: "تاريخ بدء الاشتراك مطلوب." }),
  numberOfInstallments: z.coerce.number().int().min(1, "عدد الدفعات يجب أن يكون 1 على الأقل.").optional(),
  installmentMethod: z.enum(['upfront', 'deferred', 'installments']).default('installments'),
  deferredDueDate: z.date().optional(),
  boxId: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
    if (data.installmentMethod === 'installments' && (!data.numberOfInstallments || data.numberOfInstallments <= 0)) {
        return false;
    }
    return true;
}, {
    message: "عدد الدفعات مطلوب عند اختيار طريقة الأقساط.",
    path: ['numberOfInstallments'],
}).refine(data => {
    if (data.installmentMethod === 'deferred' && !data.deferredDueDate) {
        return false;
    }
    return true;
}, {
    message: "تاريخ الاستحقاق مطلوب للدفعات المؤجلة.",
    path: ['deferredDueDate'],
});

type FormValues = z.infer<typeof formSchema>;

const Section = ({ title, children, className }: { title: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <Card className={cn("shadow-sm", className)}>
        <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-primary mb-3">{title}</h3>
            {children}
        </CardContent>
    </Card>
);

export default function AddSubscriptionDialog({ onSubscriptionAdded, children }: { onSubscriptionAdded: () => void; children?: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
  const [isSaving, setIsSaving] = useState(false);
  const [dialogDimensions, setDialogDimensions] = useState({ width: '850px', height: '90vh' });
  
  const subscriptionSettings = navData?.settings?.subscriptionSettings;
  const defaultCurrency = navData?.settings.currencySettings?.defaultCurrency || 'USD';
  
  useEffect(() => {
    if (open && !navLoaded) {
      fetchData();
    }
  }, [open, navLoaded, fetchData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        currency: defaultCurrency,
        purchaseDate: new Date(),
        clientId: '',
        supplierId: subscriptionSettings?.defaultSupplier || '',
        serviceName: '',
        purchasePrice: 0,
        quantity: subscriptionSettings?.defaultQuantity || 1,
        unitPrice: 0,
        discount: 0,
        startDate: addMonths(new Date(), 1),
        numberOfInstallments: subscriptionSettings?.defaultInstallments || 12,
        installmentMethod: 'installments',
        notes: '',
        boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
      });
    }
  }, [open, form, currentUser, navData, defaultCurrency, subscriptionSettings]);

  const { control, trigger, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isValid } } = form;
  const watchedCurrency = watch('currency');
  const installmentMethod = watch('installmentMethod');
  const quantity = watch('quantity');
  const purchaseUnitPrice = watch('purchasePrice');
  const saleUnitPrice = watch('unitPrice');
  const discount = watch('discount');

  const totalPurchase = (quantity || 0) * (purchaseUnitPrice || 0);
  const totalSale = ((quantity || 0) * (saleUnitPrice || 0)) - (discount || 0);

  const headerColor = watchedCurrency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  
  const boxName = useMemo(() => {
    const currentBoxId = watch('boxId');
    return navData?.boxes?.find(b => b.id === currentBoxId)?.name || 'غير محدد';
  }, [watch, navData?.boxes]);

  const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);
  const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: `${c.name} ${c.code ? `(${c.code})` : ''}` })), [navData?.clients]);


  const onFinalSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const client = navData?.clients?.find(c => c.id === data.clientId);
      const supplier = navData?.suppliers?.find(s => s.id === data.supplierId);

      if (!client || !supplier) {
          toast({ title: "العميل أو المورد غير موجود", variant: "destructive" });
          setIsSaving(false);
          return;
      }
      
      const newSubscriptionData: Omit<Subscription, 'id' | 'profit' | 'paidAmount' | 'status' | 'salePrice'> = {
        ...data,
        clientName: client.name,
        supplierName: supplier.name,
        purchaseDate: data.purchaseDate.toISOString(),
        startDate: data.startDate.toISOString(),
        deferredDueDate: data.deferredDueDate ? data.deferredDueDate.toISOString() : undefined,
        notes: data.notes || '',
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: data.discount || 0,
        numberOfInstallments: data.numberOfInstallments || 1,
      };
      
      const result = await addSubscriptionAction(newSubscriptionData as any);
      
      if (result.success && result.id) {
          if(onSubscriptionAdded) onSubscriptionAdded();
          toast({ title: "تمت إضافة الاشتراك بنجاح" });
          setOpen(false);
      } else {
        throw new Error(result.error || "Failed to add subscription");
      }
    } catch (error: any) {
       toast({
            title: "خطأ",
            description: error.message || "حدث خطأ أثناء إضافة الاشتراك.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة اشتراك</Button>}
      </DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="p-0 flex flex-col"
        style={{
            maxWidth: dialogDimensions.width, 
            width: '95vw',
            height: dialogDimensions.height,
            resize: 'both',
        }}
      >
        <DialogHeader 
            className="p-4 rounded-t-lg flex flex-row justify-between items-center"
            style={{ backgroundColor: headerColor, color: 'white' }}
        >
           <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 h-7 w-7 rounded-full">
                <X className="h-4 w-4"/>
              </Button>
           </DialogClose>
          <div>
            <DialogTitle className="text-white">إضافة اشتراك جديد</DialogTitle>
          </div>
           <div className="flex items-center gap-2">
                {(navData?.settings?.currencySettings?.currencies || []).map(c => (
                    <Button key={c.code} type="button" onClick={() => form.setValue('currency', c.code as Currency)} className={cn('text-white h-8', watchedCurrency === c.code ? 'bg-white/30' : 'bg-transparent border border-white/50')}>
                        {c.code}
                    </Button>
                ))}
                <VoucherDialogSettings
                    dialogKey="add_subscription"
                    onDimensionsChange={setDialogDimensions}
                >
                    <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                        <Settings2 className="h-5 w-5" />
                    </Button>
                </VoucherDialogSettings>
            </div>
        </DialogHeader>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onFinalSubmit)} className="flex flex-col flex-grow overflow-hidden">
                <div className="px-6 py-4 flex-grow overflow-y-auto space-y-4">
                    {!navLoaded ? (
                         <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Section title="المعلومات الأساسية">
                                <FormField control={control} name="serviceName" render={({ field }) => (
                                    <FormItem><FormLabel>اسم الاشتراك / الخدمة</FormLabel><FormControl><Input placeholder="مثال: اشتراك إنترنت شهري" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField control={control} name="supplierId" render={({ field }) => (
                                        <FormItem><FormLabel>المورد</FormLabel><FormControl><Autocomplete searchAction="suppliers" value={field.value} onValueChange={field.onChange} placeholder="ابحث عن مورد..."/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={control} name="clientId" render={({ field }) => (
                                        <FormItem><FormLabel>العميل</FormLabel><FormControl><Autocomplete searchAction="clients" value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل..." /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </Section>

                            <Section title="التفاصيل المالية">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={control} name="quantity" render={({ field }) => (<FormItem><FormLabel>الكمية</FormLabel><FormControl><NumericInput onValueChange={(val) => field.onChange(val || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name="discount" render={({ field }) => (<FormItem><FormLabel>الخصم</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>سعر شراء الوحدة</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>سعر بيع الوحدة</FormLabel><FormControl><NumericInput currency={watchedCurrency} onValueChange={v => field.onChange(v || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                                <Separator className="my-4"/>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>إجمالي الشراء:</Label><p className="font-bold text-lg">{totalPurchase.toLocaleString()} {watchedCurrency}</p></div>
                                    <div><Label>إجمالي البيع:</Label><p className="font-bold text-lg">{totalSale.toLocaleString()} {watchedCurrency}</p></div>
                                </div>
                            </Section>

                             <Section title="جدولة الدفعات" className="md:col-span-2">
                                <FormField
                                    name="installmentMethod"
                                    control={control}
                                    render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="font-semibold">طريقة السداد</FormLabel>
                                        <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <FormItem><FormControl><RadioGroupItem value="upfront" id="upfront" className="sr-only"/></FormControl><Label htmlFor="upfront" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'upfront' && "border-primary")}>دفعة واحدة مقدمًا</Label></FormItem>
                                            <FormItem><FormControl><RadioGroupItem value="deferred" id="deferred" className="sr-only"/></FormControl><Label htmlFor="deferred" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'deferred' && "border-primary")}>دفعة واحدة مؤجلة</Label></FormItem>
                                            <FormItem><FormControl><RadioGroupItem value="installments" id="installments" className="sr-only"/></FormControl><Label htmlFor="installments" className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", field.value === 'installments' && "border-primary")}>على شكل دفعات</Label></FormItem>
                                        </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                     <FormField control={control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>تاريخ بدء الاشتراك</FormLabel><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>)}/>
                                     {installmentMethod === 'installments' && <FormField control={control} name="numberOfInstallments" render={({ field }) => (<FormItem><FormLabel>عدد الدفعات</FormLabel><FormControl><NumericInput onValueChange={(val) => field.onChange(val || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>}
                                     {installmentMethod === 'deferred' && <FormField control={control} name="deferredDueDate" render={({ field }) => (<FormItem><FormLabel>تاريخ استحقاق الدفعة المؤجلة</FormLabel><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>)} />}
                                </div>
                            </Section>
                             <div className="md:col-span-2"><FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t flex-row items-center justify-between sticky bottom-0 bg-background mt-auto">
                     <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-primary"/> <span>{currentUser?.name || '...'}</span></div>
                        <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary"/> <span>{boxName}</span></div>
                        <div className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <Save className="me-2 h-4 w-4" />
                            حفظ الاشتراك
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
