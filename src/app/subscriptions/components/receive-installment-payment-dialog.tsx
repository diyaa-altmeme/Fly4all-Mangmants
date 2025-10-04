
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionInstallment, Box, Currency, User, Subscription } from '@/lib/types';
import { Loader2, WalletCards, Save, User as UserIcon, Hash, CircleDollarSign, Coins, Wallet } from 'lucide-react';
import { paySubscriptionInstallment } from '@/app/subscriptions/actions';
import { Label } from '@/components/ui/label';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useAuth } from '@/context/auth-context';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
    paymentAmount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر."),
    paymentCurrency: z.enum(['USD', 'IQD']),
    exchangeRate: z.coerce.number().optional(),
    discount: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const StatCard = ({ title, value, currency, className }: { title: string; value: number; currency: Currency; className?: string; }) => (
    <Card className={cn("text-center", className)}>
        <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold font-mono">{value.toLocaleString()}</p>
        </CardContent>
    </Card>
);

interface ReceiveInstallmentPaymentDialogProps {
    installment: SubscriptionInstallment;
    subscription: Subscription;
    onPaymentSuccess: () => void;
    children: React.ReactNode;
}

export default function ReceiveInstallmentPaymentDialog({ installment, subscription, onPaymentSuccess, children }: ReceiveInstallmentPaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { data: navData, loaded } = useVoucherNav();
    const { user: currentUser } = useAuth();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const remainingAmountOnInstallment = useMemo(() => 
      (installment.amount || 0) - ((installment.paidAmount || 0) + (installment.discount || 0)),
      [installment]
    );

     const remainingAmountOnSubscription = useMemo(() =>
        (subscription.salePrice || 0) - (subscription.paidAmount || 0),
    [subscription]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paymentAmount: remainingAmountOnInstallment,
            paymentCurrency: installment.currency,
            exchangeRate: navData?.settings?.currencySettings?.exchangeRates['USD_IQD'] || 1480,
            discount: 0,
        }
    });
    
    useEffect(() => {
        if(open) {
            form.reset({
                paymentAmount: remainingAmountOnInstallment,
                paymentCurrency: installment.currency,
                exchangeRate: navData?.settings?.currencySettings?.exchangeRates['USD_IQD'] || 1480,
                discount: 0,
            });
        }
    }, [open, installment, form, navData, remainingAmountOnInstallment]);

    const { isSubmitting, watch, control, handleSubmit: handleFormSubmit } = form;
    const watchedPaymentCurrency = watch('paymentCurrency');
    const watchedAmountPaid = watch('paymentAmount');
    const watchedExchangeRate = watch('exchangeRate');
    const watchedDiscount = watch('discount');


    const amountInInstallmentCurrency = useMemo(() => {
        const paid = watchedAmountPaid || 0;
        const discount = watchedDiscount || 0;
        const totalPaidAndDiscounted = paid + discount;

        if (watchedPaymentCurrency === installment.currency) {
            return totalPaidAndDiscounted;
        }
        if (!watchedExchangeRate || watchedExchangeRate === 0) return 0;
        return watchedPaymentCurrency === 'USD' 
            ? totalPaidAndDiscounted * watchedExchangeRate
            : totalPaidAndDiscounted / watchedExchangeRate;
    }, [watchedPaymentCurrency, installment.currency, watchedAmountPaid, watchedDiscount, watchedExchangeRate]);
    
    const newRemainingAmount = remainingAmountOnInstallment - amountInInstallmentCurrency;
    
    const handleSubmit = async (data: FormValues) => {
        if (!currentUser || !('role' in currentUser) || !currentUser.boxId) {
            toast({ title: 'خطأ', description: 'الصندوق غير محدد للمستخدم الحالي.', variant: 'destructive'});
            return;
        }

        onPaymentSuccess();
        setOpen(false);
        toast({ title: "جاري تسجيل الدفعة..." });
        
        const result = await paySubscriptionInstallment(installment.id, currentUser.boxId, data.paymentAmount, data.paymentCurrency, data.exchangeRate, data.discount);
        
        if (result.success) {
            toast({ title: "تم تسجيل الدفعة بنجاح" });
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
    };
    
    const headerColor = watchedPaymentCurrency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';


    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="p-0 sm:max-w-xl">
                <Form {...form}>
                    <form onSubmit={handleFormSubmit(handleSubmit)} className="flex flex-col flex-grow overflow-hidden">
                        <DialogHeader 
                          className="p-4 rounded-t-lg"
                          style={{ backgroundColor: headerColor, color: 'white' }}
                        >
                            <DialogTitle className="text-white">تسجيل دفعة قسط</DialogTitle>
                            <DialogDescription className="text-white/80">
                                يمكنك تسديد القسط الحالي، أو تسديد مبلغ أكبر لتغطية أقساط مستقبلية أو ليكون كرصيد للعميل.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard title="قيمة القسط" value={installment.amount} currency={installment.currency}/>
                                <StatCard title="المتبقي من القسط" value={remainingAmountOnInstallment} currency={installment.currency} className="border-red-500/50 bg-red-50 dark:bg-red-950/30"/>
                                <StatCard title="المتبقي من الاشتراك" value={remainingAmountOnSubscription} currency={installment.currency} className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30"/>
                                <StatCard title="المتبقي بعد الدفعة" value={newRemainingAmount} currency={installment.currency} className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30"/>
                            </div>

                             <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                                <FormField control={control} name="paymentAmount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>المبلغ المدفوع الآن</FormLabel>
                                        <FormControl>
                                            <NumericInput
                                                currency={watchedPaymentCurrency}
                                                currencyClassName={cn(watchedPaymentCurrency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} 
                                                value={field.value}
                                                onValueChange={v => field.onChange(v || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                                 <FormField
                                    control={form.control}
                                    name="paymentCurrency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>عملة الدفع</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {(navData?.settings?.currencySettings?.currencies || []).map(c => (
                                                        <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField control={control} name="discount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>خصم على القسط</FormLabel>
                                        <FormControl>
                                            <NumericInput
                                                currency={watchedPaymentCurrency}
                                                currencyClassName={cn(watchedPaymentCurrency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} 
                                                value={field.value}
                                                onValueChange={v => field.onChange(v || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                            </div>
                            
                            {watchedPaymentCurrency !== installment.currency && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={control} name="exchangeRate" render={({ field }) => (
                                        <FormItem><FormLabel>سعر الصرف</FormLabel><FormControl><NumericInput value={field.value} onValueChange={v => field.onChange(v || 0)} /></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <div className="space-y-1.5">
                                        <Label>المبلغ المعادل</Label>
                                        <Input value={`${amountInInstallmentCurrency.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${installment.currency}`} readOnly disabled className="font-mono"/>
                                    </div>
                                </div>
                            )}
                        </div>
                         <DialogFooter className="p-4 border-t bg-background mt-4">
                             <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5"><UserIcon className="h-4 w-4"/> <span>{currentUser?.name || '...'}</span></div>
                                    <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/> <span>{navData?.boxes?.find(b => b.id === currentUser?.boxId)?.name || '...'}</span></div>
                                    <div className="flex items-center gap-1.5"><Hash className="h-4 w-4"/> <span>رقم الفاتورة: (تلقائي)</span></div>
                                </div>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                    تأكيد استلام الدفعة
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
