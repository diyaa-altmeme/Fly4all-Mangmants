
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
import { Loader2, Calendar as CalendarIcon, PlusCircle, User as UserIcon, Hash, Wallet, ArrowLeft, ArrowRight, X, Building, Store, Settings2 } from 'lucide-react';
import { Stepper, StepperItem, useStepper } from '@/components/ui/stepper';
import { addSubscription as addSubscriptionAction } from '@/app/subscriptions/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DateTimePicker } from '../ui/datetime-picker';
import { NumericInput } from '../ui/numeric-input';
import { useAuth } from '@/context/auth-context';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '../ui/label';

const step1Schema = z.object({
  supplierId: z.string().min(1, "الرجاء اختيار مورد."),
  serviceName: z.string().min(2, { message: "اسم الاشتراك مطلوب." }),
  purchaseDate: z.date({ required_error: "تاريخ الشراء مطلوب." }),
  clientId: z.string().min(1, "الرجاء اختيار عميل."),
  currency: z.enum(['USD', 'IQD']),
});

const step2Schema = z.object({
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل.").default(1),
  purchasePrice: z.coerce.number().min(0, "سعر شراء الوحدة يجب ان يكون صفرا أو أكثر."),
  unitPrice: z.coerce.number().min(0, "سعر بيع الوحدة يجب أن يكون أكبر من صفر"),
  startDate: z.date({ required_error: "تاريخ بدء الاشتراك مطلوب." }),
  numberOfInstallments: z.coerce.number().int().min(1, "عدد الدفعات يجب أن يكون 1 على الأقل."),
  boxId: z.string().optional(),
  notes: z.string().optional(),
});

const formSchema = z.object({...step1Schema.shape, ...step2Schema.shape});
type FormValues = z.infer<typeof formSchema>;

const steps = [
    { label: "المعلومات الأساسية", icon: Store },
    { label: "التفاصيل المالية", icon: Building },
];

function Step1Fields({ control }: { control: any }) {
    const { data: navData } = useVoucherNav();
    const clientOptions = React.useMemo(() => (navData?.clients || []).map(c => ({ value: c.id, label: c.name })), [navData?.clients]);
    const supplierOptions = React.useMemo(() => (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name })), [navData?.suppliers]);

    return (
        <div className="space-y-4">
            <FormField control={control} name="serviceName" render={({ field }) => (
                <FormItem><FormLabel>اسم الاشتراك / الخدمة</FormLabel><FormControl><Input placeholder="مثال: اشتراك إنترنت شهري" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="supplierId" render={({ field }) => (
                    <FormItem><FormLabel>المورد</FormLabel><FormControl><Autocomplete searchAction='suppliers' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن مورد..."/></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="clientId" render={({ field }) => (
                    <FormItem><FormLabel>العميل</FormLabel><FormControl><Autocomplete searchAction='clients' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن عميل..." /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="purchaseDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ الشراء</FormLabel><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={control} name="currency" render={({ field }) => (<FormItem><FormLabel>العملة</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
        </div>
    );
}

function Step2Fields() {
     const { control, watch } = useFormContext<FormValues>();
     const currency = watch('currency');
     const quantity = watch('quantity');
     const purchaseUnitPrice = watch('purchasePrice');
     const saleUnitPrice = watch('unitPrice');

     const totalPurchase = (quantity || 0) * (purchaseUnitPrice || 0);
     const totalSale = (quantity || 0) * (saleUnitPrice || 0);

     return (
        <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="quantity" render={({ field }) => (<FormItem><FormLabel>الكمية</FormLabel><FormControl><NumericInput onValueChange={(val) => field.onChange(val || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                <div />
                <FormField control={control} name="purchasePrice" render={({ field }) => (<FormItem><FormLabel>سعر شراء الوحدة</FormLabel><FormControl><NumericInput currency={currency} onValueChange={v => field.onChange(v || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>سعر بيع الوحدة</FormLabel><FormControl><NumericInput currency={currency} onValueChange={v => field.onChange(v || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>

                 <Card className="bg-muted/50"><CardContent className="pt-6"><Label>إجمالي الشراء</Label><p className="font-bold text-lg">{totalPurchase.toLocaleString()} {currency}</p></CardContent></Card>
                 <Card className="bg-muted/50"><CardContent className="pt-6"><Label>إجمالي البيع</Label><p className="font-bold text-lg">{totalSale.toLocaleString()} {currency}</p></CardContent></Card>

                <FormField control={control} name="startDate" render={({ field }) => (<FormItem><FormLabel>تاريخ بدء الاشتراك</FormLabel><FormControl><DateTimePicker date={field.value} setDate={field.onChange} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={control} name="numberOfInstallments" render={({ field }) => (<FormItem><FormLabel>عدد الدفعات</FormLabel><FormControl><NumericInput onValueChange={(val) => field.onChange(val || 0)} value={field.value} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
             <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
        </div>
    );
}


export default function AddSubscriptionDialog({ onSubscriptionAdded, children }: { onSubscriptionAdded: () => void; children?: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: navData, loaded: navLoaded, fetchData } = useVoucherNav();
  const { activeStep, goToNextStep, goToPreviousStep, resetSteps } = useStepper({ initialStep: 0, steps });
  const [isSaving, setIsSaving] = useState(false);
  const [dialogDimensions, setDialogDimensions] = useState({ width: '850px', height: '90vh' });
  
  const defaultCurrency = navData?.settings.currencySettings?.defaultCurrency || 'USD';
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: 'USD',
      purchaseDate: new Date(),
      clientId: '',
      supplierId: '',
      serviceName: '',
      purchasePrice: 0,
      quantity: 1,
      unitPrice: 0,
      startDate: new Date(),
      numberOfInstallments: 12,
      notes: '',
      boxId: '',
    }
  });

  useEffect(() => {
    if (currentUser && 'role' in currentUser && currentUser.boxId) {
        form.setValue('boxId', currentUser.boxId);
      }
  }, [currentUser, form]);
  
  const { control, trigger, handleSubmit, watch, reset: resetForm, setValue, getValues, formState } = form;
  const { isSubmitting } = formState;

  const watchedCurrency = watch('currency');

  const headerColor = watchedCurrency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  
  const boxName = useMemo(() => {
    const currentBoxId = watch('boxId');
    return navData?.boxes?.find(b => b.id === currentBoxId)?.name || 'غير محدد';
  }, [watch, navData?.boxes]);


  const handleNext = async () => {
      const step1Fields: (keyof FormValues)[] = ['serviceName', 'supplierId', 'clientId', 'purchaseDate', 'currency'];
      const isValid = await trigger(step1Fields);
      if(isValid) goToNextStep();
  }
  
  React.useEffect(() => {
    if (!open) {
        resetSteps();
        resetForm();
    } else {
        if (currentUser && 'role' in currentUser && currentUser.boxId) {
            setValue('boxId', currentUser.boxId);
        }
    }
  }, [open, resetSteps, resetForm, setValue, currentUser]);

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
        purchaseDate: format(data.purchaseDate, 'yyyy-MM-dd HH:mm:ss'),
        startDate: format(data.startDate, 'yyyy-MM-dd HH:mm:ss'),
        notes: data.notes || '',
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: 0, // Defaulting as UI was removed
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

  const { purchasePrice, unitPrice, numberOfInstallments, startDate, quantity } = watch();
  const isStep2Valid = useMemo(() => {
    return (purchasePrice ?? 0) >= 0 && (unitPrice ?? 0) > 0 && (numberOfInstallments ?? 0) > 0 && !!startDate;
  }, [purchasePrice, unitPrice, numberOfInstallments, startDate]);


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
                <div className="p-6">
                    <Stepper activeStep={activeStep}>
                        {steps.map((step, index) => (
                            <StepperItem 
                            key={step.label}
                            label={step.label} 
                            icon={<step.icon />}
                            isCompleted={activeStep > index}
                            isActive={activeStep === index}
                            isLast={index === steps.length - 1}
                            />
                        ))}
                    </Stepper>
                </div>
                <div className="px-6 pb-6 flex-grow overflow-y-auto">
                    {!navLoaded ? (
                         <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : (
                        <>
                            <div className={cn(activeStep !== 0 && "hidden")}><Step1Fields control={control} /></div>
                            <div className={cn(activeStep !== 1 && "hidden")}><Step2Fields /></div>
                        </>
                    )}
                </div>

                <DialogFooter className="p-4 border-t flex-row items-center justify-between sticky bottom-0 bg-background mt-auto">
                    <div className="flex items-center gap-2">
                        {activeStep === 0 && (
                            <DialogClose asChild><Button variant="ghost">إلغاء</Button></DialogClose>
                        )}
                        {activeStep > 0 && (
                            <Button type="button" variant="outline" onClick={goToPreviousStep}>
                                <ArrowRight className="me-2 h-4 w-4" />
                                السابق
                            </Button>
                        )}
                    </div>
                     <div className="flex-grow">
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4 text-primary"/> <span>{currentUser?.name || '...'}</span></div>
                            <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary"/> <span>{boxName}</span></div>
                            <div className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeStep < steps.length - 1 ? (
                           <Button type="button" onClick={handleNext}>التالي<ArrowLeft className="ms-2 h-4 w-4" /></Button>
                        ) : (
                           <Button type="submit" disabled={isSubmitting || !isStep2Valid}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                حفظ الاشتراك
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
