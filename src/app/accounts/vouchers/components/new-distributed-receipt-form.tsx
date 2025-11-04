
"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDistributedReceiptSchema, type DistributedReceiptInput } from '@/app/accounts/vouchers/distributed/schema';
import { useToast } from "@/hooks/use-toast";
import { createDistributedVoucher, updateDistributedVoucher } from "@/app/accounts/vouchers/distributed/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Save, User as UserIcon, Hash, Search, ArrowRightLeft, Building, Phone, Wallet, FileText, ChevronDown, Info, Send, Printer, UserRound, BookCopy, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import type { Client, User as CurrentUser, Currency, Box, Supplier } from '@/lib/types';
import { Autocomplete } from "@/components/ui/autocomplete";
import type { DistributedVoucherSettings } from "@/app/accounts/vouchers/settings/components/distributed-settings-form";
import { updateVoucher } from "@/app/accounts/vouchers/list/actions";
import { NumericInput } from "@/components/ui/numeric-input";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from "@/lib/auth-context";


const AmountInput = ({ currency, className, ...props }: { currency: Currency, className?: string } & React.ComponentProps<typeof NumericInput>) => (
    <NumericInput 
        currency={currency} 
        className={cn("text-right", className)} 
        currencyClassName={cn(currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} 
        {...props} 
    />
);


interface NewDistributedReceiptFormProps {
    settings: DistributedVoucherSettings;
    selectedCurrency: Currency;
    onVoucherAdded?: (voucher: any) => void;
    onVoucherUpdated?: (voucher: any) => void;
    isEditing?: boolean;
    initialData?: DistributedReceiptInput & { id?: string };
}

export default function NewDistributedReceiptForm({ 
    settings, 
    selectedCurrency,
    onVoucherAdded, 
    isEditing,
    initialData,
    onVoucherUpdated
}: NewDistributedReceiptFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { data: navData, loaded: isDataLoaded, refreshData } = useVoucherNav();
  
  const dynamicSchema = React.useMemo(() => {
    return createDistributedReceiptSchema(settings?.distributionChannels);
  }, [settings]);
  
  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: isEditing && initialData ? {
      ...initialData,
      date: initialData.date ? parseISO(initialData.date as any) : new Date(),
    } : {
      date: new Date(),
      currency: selectedCurrency,
      exchangeRate: 0,
      totalAmount: 0,
      notes: '',
      companyAmount: 0,
      distributions: (settings.distributionChannels || []).reduce((acc, channel) => {
        acc[channel.id] = { amount: 0 };
        return acc;
      }, {} as any),
      boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
    }
  });

  React.useEffect(() => {
    if (isDataLoaded) {
      const defaultValues = isEditing && initialData
          ? { 
              ...initialData,
              date: initialData.date ? parseISO(initialData.date as any) : new Date(),
            }
          : {
              date: new Date(),
              currency: selectedCurrency,
              exchangeRate: 0,
              totalAmount: 0,
              notes: '',
              companyAmount: 0,
              distributions: (settings.distributionChannels || []).reduce((acc, channel) => {
                  acc[channel.id] = { amount: 0 };
                  return acc;
              }, {} as any),
              boxId: (currentUser && 'role' in currentUser) ? currentUser.boxId : '',
              userId: (currentUser && 'uid' in currentUser) ? currentUser.uid : '',
          };
      form.reset(defaultValues as any);
    }
  }, [settings, isEditing, initialData, selectedCurrency, currentUser, form, isDataLoaded]);

  const { isSubmitting, watch, control, setValue, getValues, register, formState: { errors } } = form;
  const watchedCurrency = watch('currency');

  const boxName = React.useMemo(() => {
    const boxId = watch('boxId');
    return navData?.boxes?.find(b => b.id === boxId)?.name || 'غير محدد';
  }, [watch, navData?.boxes]);


  React.useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name?.startsWith('distributions.') || name === 'totalAmount') {
        const currentValues = getValues();
        const totalAmount = Number(currentValues.totalAmount) || 0;
        
        const totalDist = Object.values(currentValues.distributions || {}).reduce(
          (sum, item: any) => sum + (Number(item.amount) || 0),
          0
        );

        const newCompanyAmount = totalAmount - totalDist;
        
        if (newCompanyAmount !== (Number(currentValues.companyAmount) || 0)) {
            setValue('companyAmount', newCompanyAmount >= 0 ? newCompanyAmount : 0, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues]);


  const onSubmit = async (data: z.infer<typeof dynamicSchema>) => {
    try {
        const payload = {
            ...data,
            distributions: Object.fromEntries(
                Object.entries(data.distributions).map(([key, value]) => [
                    key,
                    { amount: Number((value as any).amount) || 0, enabled: true }
                ])
            )
        };

        if(isEditing && initialData?.id) {
            const result = await updateDistributedVoucher(initialData.id, payload);
            if (result.success) {
                toast({ title: 'تم تحديث السند بنجاح' });
                 if (onVoucherUpdated) onVoucherUpdated({});
            } else {
                 toast({ title: "خطأ في التحديث", description: result.error, variant: 'destructive' });
            }
        } else {
             const result = await createDistributedVoucher(payload);
            if (result.success) {
                toast({ title: "تم إنشاء السند بنجاح" });
                if(onVoucherAdded) onVoucherAdded(result);
                form.reset();
            } else {
                toast({ title: "خطأ في الحفظ", description: result.error, variant: 'destructive' });
            }
        }
    } catch(e: any) {
         toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };
  
  if (!isDataLoaded) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
             <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <BookCopy className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">معلومات السند الأساسية</h3>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap">التاريخ</Label>
                        <Controller control={control} name="date" render={({ field }) => ( <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'yyyy-MM-dd') : <span>اختر تاريخ</span>}<CalendarIcon className="ms-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => {if(d) field.onChange(d);}} /></PopoverContent></Popover>)} />
                        {errors.date && <p className="text-sm text-destructive h-4">{errors.date.message}</p>}
                    </div>
                     <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap">العملة</Label>
                        <Controller name="currency" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                     {(navData?.settings?.currencySettings?.currencies || []).map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )} />
                    </div>
                    <FormItem className="flex items-center gap-2">
                        <Label className="whitespace-nowrap">الحساب الدافع</Label>
                        <Controller control={control} name="accountId" render={({ field }) => (<FormControl><Autocomplete searchAction='all' value={field.value} onValueChange={field.onChange} placeholder="ابحث عن حساب..."/></FormControl>)} />
                        <FormMessage />
                    </FormItem>
                </div>
            </div>
            
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">التفاصيل المالية والتوزيع</h3>
                </div>
                 <div className="grid grid-cols-1 gap-x-4 gap-y-5 p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={control} name="totalAmount" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><Label>إجمالي المبلغ</Label><FormMessage /></div><Controller control={control} name="totalAmount" render={({field}) => <AmountInput currency={watchedCurrency} {...field} onValueChange={(v) => field.onChange(v || 0)} />} /></FormItem>)} />
                        {watchedCurrency === 'USD' && 
                            <FormField control={control} name="exchangeRate" render={({ field }) => (<FormItem><div className="flex items-center justify-between"><Label>سعر الصرف</Label><FormMessage /></div><Controller control={control} name="exchangeRate" render={({field}) => <AmountInput currency="IQD" {...field} onValueChange={(v) => field.onChange(v || 0)} />} /></FormItem>)} />
                        }
                    </div>

                    <Separator className="my-4"/>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                        <FormField control={control} name="companyAmount" render={({ field }) => (
                            <FormItem>
                                <Label>المبلغ المسدد لحساب الدافع</Label>
                                <Controller control={control} name="companyAmount" render={({field}) => <AmountInput readOnly currency={watchedCurrency} {...field} onValueChange={field.onChange} />} />
                                <FormMessage />
                            </FormItem>
                        )} />
                        {(settings.distributionChannels || []).map((channel) => (
                            <FormField
                                key={channel.id}
                                control={control}
                                name={`distributions.${channel.id}.amount`}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>{channel.label}</Label>
                                        <Controller
                                            control={control}
                                            name={`distributions.${channel.id}.amount`}
                                            render={({field}) => <AmountInput currency={watchedCurrency} {...field} onValueChange={(v) => field.onChange(v || 0)} />}
                                        />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     <div className="col-span-full">
                        <Label>التفاصيل</Label>
                        <Textarea {...register('details')}/>
                        <FormMessage>{errors.details?.message}</FormMessage>
                    </div>
                </div>
            </div>

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 sticky bottom-0 bg-background py-4 px-6 -mx-6 -mb-6 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                    <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>الصندوق: {boxName}</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>الرقم العام: (تلقائي)</span></div>
                </div>
                <div className="flex-grow"></div>
                <Button type="button" variant="outline" size="lg"><Printer className="me-2 h-4 w-4"/> طباعة</Button>
                <Button type="button" variant="outline" size="lg" className="bg-green-600 text-white hover:bg-green-700 hover:text-white"><Send className="me-2 h-4 w-4"/> إرسال واتساب</Button>
                <Button type="submit" size="lg" disabled={isSubmitting} className="bg-orange-500 text-white hover:bg-orange-600">
                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4"/>
                    {isEditing ? 'حفظ التعديلات' : 'حفظ السند'}
                </Button>
            </DialogFooter>
        </form>
    </Form>
  );
}
