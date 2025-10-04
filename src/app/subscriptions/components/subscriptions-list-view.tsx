
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Subscription, SubscriptionInstallment, Payment, Currency, SubscriptionStatus } from '@/lib/types';
import { Button, buttonVariants } from "@/components/ui/button";
import { Settings, History, MessageSquare, Trash2, Loader2, WalletCards, CheckCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import SubscriptionsSettingsDialog from '@/components/settings/subscriptions-settings-dialog';
import { softDeleteSubscription } from '@/app/subscriptions/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import ReceiveInstallmentPaymentDialog from '@/app/subscriptions/components/receive-installment-payment-dialog';
import { getInstallmentPayments, deletePayment } from '@/app/subscriptions/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { sendInstallmentReminder } from '@/ai/flows/send-installment-reminder';
import EditPaymentDialog from '@/app/subscriptions/components/edit-payment-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { produce } from 'immer';
import InvoiceDialog from '@/app/subscriptions/components/invoice-dialog';
import UpdateSubscriptionStatusDialog from './update-subscription-status-dialog';
import { ChevronDown, Edit, MoreHorizontal, FileText as InvoiceIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import ManageInstallmentsDialog from '@/components/subscriptions/manage-installments-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (amount: number, currency: Currency) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat("en-US").format(amount) + ` ${currency}`;
};

const statusStyles: Record<Subscription['status'], string> = {
  Active: "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
  Paid: "text-green-600 bg-green-100 border-green-200 dark:bg-green-900/50 dark:text-green-300",
  Cancelled: "text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300",
  Suspended: "text-yellow-600 bg-yellow-100 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300",
};

const statusTranslations: Record<Subscription['status'], string> = {
  Active: "نشط",
  Paid: "مدفوع بالكامل",
  Cancelled: "ملغي",
  Suspended: "متوقف",
};

const installmentStatusStyles: Record<SubscriptionInstallment['status'], string> = {
  Paid: "text-green-600 bg-green-100 border-green-200",
  Unpaid: "text-red-600 bg-red-100 border-red-200",
};

const installmentStatusTranslations: Record<SubscriptionInstallment['status'], string> = {
  Paid: "مدفوع",
  Unpaid: "غير مدفوع",
};

const InstallmentDetails = ({ installment, subscription, onDataChange }: { installment: SubscriptionInstallment, subscription: Subscription, onDataChange: () => void }) => {
    const [payments, setPayments] = React.useState<Payment[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isPaymentsOpen, setIsPaymentsOpen] = React.useState(false);
    const { toast } = useToast();

    const loadPayments = React.useCallback(async () => {
        if (isPaymentsOpen) { // If already open, close it
            setIsPaymentsOpen(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedPayments = await getInstallmentPayments(installment.id);
            setPayments(fetchedPayments);
            setIsPaymentsOpen(true);
        } catch(e: any) {
            toast({ title: 'خطأ', description: `فشل تحميل دفعات القسط: ${e.message}`, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [installment.id, toast, isPaymentsOpen]);

    const handleSendReminder = async () => {
        if (!subscription.client) {
            toast({ title: 'خطأ', description: 'بيانات العميل غير متوفرة لهذا الاشتراك.', variant: 'destructive' });
            return;
        }
        toast({ title: 'جاري إرسال التذكير...' });
        const result = await sendInstallmentReminder({
            clientName: subscription.clientName,
            clientPhone: subscription.client.phone,
            serviceName: subscription.serviceName,
            amountDue: installment.amount - (installment.paidAmount || 0) - (installment.discount || 0),
            currency: installment.currency,
            dueDate: installment.dueDate,
        });

        if (result.success) {
            toast({ title: 'تم إرسال التذكير بنجاح' });
        } else {
            toast({ title: 'فشل إرسال التذكير', description: result.message, variant: 'destructive' });
        }
    };
    
    const handleDeletePayment = async (paymentId: string) => {
        const result = await deletePayment(paymentId);
        if (result.success) {
            toast({title: "تم حذف الدفعة بنجاح"});
            onDataChange();
        } else {
            toast({title: "خطأ", description: result.error, variant: 'destructive'});
        }
    }
    
    const remainingOnInstallment = (installment.amount || 0) - ((installment.paidAmount || 0) + (installment.discount || 0));

    return (
        <Collapsible asChild>
            <tbody className="bg-background">
                <TableRow>
                    <TableCell className="p-0 text-center">
                         <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadPayments}>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isPaymentsOpen && 'rotate-180')} />
                            </Button>
                        </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>{format(parseISO(installment.dueDate), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                        <Badge className={cn(installmentStatusStyles[installment.status], "font-bold")}>{installmentStatusTranslations[installment.status]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(installment.amount, installment.currency)}</TableCell>
                    <TableCell className="font-mono text-green-600">{formatCurrency(installment.paidAmount || 0, installment.currency)}</TableCell>
                    <TableCell className="font-mono text-orange-600">{formatCurrency(installment.discount || 0, installment.currency)}</TableCell>
                    <TableCell className="font-mono text-red-600">{formatCurrency(remainingOnInstallment, installment.currency)}</TableCell>
                    <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-2">
                            <ReceiveInstallmentPaymentDialog installment={installment} subscription={subscription} onPaymentSuccess={onDataChange}>
                                <Button size="sm" variant="secondary" disabled={installment.status === 'Paid'}>تسجيل دفعة</Button>
                            </ReceiveInstallmentPaymentDialog>
                            <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); handleSendReminder();}} disabled={installment.status === 'Paid'}>إرسال تذكير</Button>
                        </div>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                     <TableRow>
                        <TableCell colSpan={8} className="p-2">
                             {isLoading ? (
                                <div className="flex justify-center items-center h-24">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                payments.length > 0 ? (
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md">
                                        <h4 className="font-semibold text-sm mb-2">الدفعات المسجلة:</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>تاريخ الدفع</TableHead>
                                                    <TableHead>الموظف</TableHead>
                                                    <TableHead>المبلغ</TableHead>
                                                    <TableHead>الخصم</TableHead>
                                                    <TableHead className="text-center">إجراءات</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{format(parseISO(p.date), 'yyyy-MM-dd HH:mm')}</TableCell>
                                                        <TableCell>{p.paidBy || 'غير معروف'}</TableCell>
                                                        <TableCell className="font-mono">{formatCurrency(p.amount, installment.currency)}</TableCell>
                                                        <TableCell className="font-mono">{formatCurrency(p.discount || 0, installment.currency)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center">
                                                                 <EditPaymentDialog payment={p} onPaymentUpdated={onDataChange}>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"><Edit className="h-4 w-4" /></Button>
                                                                </EditPaymentDialog>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذه الدفعة وعكس تأثيرها المالي.</AlertDialogDescription></AlertDialogHeader>
                                                                        <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePayment(p.id)} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، احذف</AlertDialogAction></AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                     <p className="text-center text-sm text-muted-foreground p-4">لا توجد دفعات مسجلة لهذا القسط.</p>
                                )
                            )}
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </tbody>
        </Collapsible>
    );
};

const SubscriptionRow = ({ subscription, allInstallments, onDataChange }: { 
    subscription: Subscription, 
    allInstallments: SubscriptionInstallment[],
    onDataChange: () => void 
}) => {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleDelete = async () => {
        const result = await softDeleteSubscription(subscription.id);
        if (result.success) {
            toast({ title: "تم حذف الاشتراك بنجاح" });
            onDataChange();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const subscriptionInstallments = useMemo(() => 
        Array.isArray(allInstallments) ? allInstallments.filter(inst => inst.subscriptionId === subscription.id).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) : [],
    [allInstallments, subscription.id]);
    
    const totalPaid = subscription.paidAmount || 0;
    const totalDiscount = subscriptionInstallments.reduce((sum, inst) => sum + (inst.discount || 0), 0);
    const remainingAmount = subscription.salePrice - totalPaid;
    const dynamicStatus: SubscriptionStatus = remainingAmount <= 0.01 && subscription.status !== 'Cancelled' && subscription.status !== 'Suspended' ? 'Paid' : subscription.status;

    return (
      <Collapsible asChild>
        <tbody className="border-b">
          <TableRow data-state={isOpen ? "open" : "closed"} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
            <TableCell>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </TableCell>
            <TableCell className="font-semibold">{subscription.invoiceNumber}</TableCell>
            <TableCell className="font-semibold">{subscription.serviceName}</TableCell>
            <TableCell>{subscription.clientName}</TableCell>
            <TableCell>{subscription.supplierName}</TableCell>
            <TableCell className="text-center font-mono font-bold">{formatCurrency(subscription.salePrice, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-green-700">{formatCurrency(subscription.profit, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-green-600">{formatCurrency(totalPaid - totalDiscount, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-orange-600">{formatCurrency(totalDiscount, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-red-600">{formatCurrency(remainingAmount, subscription.currency)}</TableCell>
            <TableCell className="text-center"><Badge variant="outline" className={cn("capitalize font-bold", statusStyles[dynamicStatus])}>{statusTranslations[dynamicStatus]}</Badge></TableCell>
            <TableCell className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ManageInstallmentsDialog subscription={subscription} onSuccess={onDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><WalletCards className="me-2 h-4 w-4" />إدارة الأقساط</DropdownMenuItem>
                  </ManageInstallmentsDialog>
                  <InvoiceDialog subscription={subscription} installments={subscriptionInstallments} />
                  <UpdateSubscriptionStatusDialog subscription={subscription} onStatusChange={onDataChange}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}><ShieldCheck className="me-2 h-4 w-4" />تغيير الحالة</DropdownMenuItem>
                  </UpdateSubscriptionStatusDialog>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4" />حذف</DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>سيتم نقل الاشتراك إلى سجل المحذوفات.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(); }} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، احذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          <CollapsibleContent asChild>
            <TableRow>
              <TableCell colSpan={12} className="p-0">
                <div className="p-4 bg-muted/50 space-y-4">
                  <div className="flex items-center gap-x-6 text-xs p-2">
                    <span className="font-semibold">تاريخ الشراء: <span className="font-normal">{format(parseISO(subscription.purchaseDate), 'yyyy-MM-dd')}</span></span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="font-semibold">تاريخ البدء: <span className="font-normal">{format(parseISO(subscription.startDate), 'yyyy-MM-dd')}</span></span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="font-semibold">الكمية: <span className="font-normal">{subscription.quantity}</span></span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="font-semibold">سعر بيع الوحدة: <span className="font-normal font-mono">{formatCurrency(subscription.unitPrice, subscription.currency)}</span></span>
                    {subscription.notes && <><Separator orientation="vertical" className="h-4" /><span className="font-semibold col-span-full">ملاحظات: <span className="font-normal">{subscription.notes}</span></span></>}
                  </div>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>تاريخ الاستحقاق</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>المدفوع</TableHead>
                          <TableHead>الخصم</TableHead>
                          <TableHead>المتبقي</TableHead>
                          <TableHead className="text-left w-[240px]">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      {subscriptionInstallments.map(inst => (
                        <InstallmentDetails key={inst.id} installment={inst} subscription={subscription} onDataChange={onDataChange} />
                      ))}
                    </Table>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        </tbody>
      </Collapsible>
    );
};


interface SubscriptionsListViewProps {
  subscriptions: Subscription[];
  allInstallments: SubscriptionInstallment[];
  onDataChange: () => void;
}

export default function SubscriptionsListView({ subscriptions, allInstallments, onDataChange }: SubscriptionsListViewProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<SubscriptionStatus | 'all'>('all');
    
    const filteredSubscriptions = React.useMemo(() => {
        return subscriptions.filter(sub => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? 
                sub.serviceName.toLowerCase().includes(searchTermLower) || 
                sub.clientName.toLowerCase().includes(searchTermLower) || 
                sub.supplierName.toLowerCase().includes(searchTermLower) ||
                (sub.invoiceNumber || '').toLowerCase().includes(searchTermLower)
                : true;
            
            const totalPaid = sub.paidAmount || 0;
            const remainingAmount = sub.salePrice - totalPaid;
            const dynamicStatus: SubscriptionStatus = remainingAmount <= 0.01 && sub.status !== 'Cancelled' && sub.status !== 'Suspended' ? 'Paid' : sub.status;
            const matchesStatus = statusFilter === 'all' ? true : dynamicStatus === statusFilter;

            return matchesSearch && matchesStatus;
        })
    }, [subscriptions, searchTerm, statusFilter]);
  
  return (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input 
                    placeholder="بحث باسم الاشتراك، العميل، المورد، أو رقم الفاتورة..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pr-10"
                />
            </div>
             <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    {Object.keys(statusTranslations).map(status => (
                        <SelectItem key={status} value={status}>{statusTranslations[status as SubscriptionStatus]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
         <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="font-bold">الفاتورة</TableHead>
                        <TableHead className="font-bold">الاشتراك</TableHead>
                        <TableHead className="font-bold">العميل</TableHead>
                        <TableHead className="font-bold">المورد</TableHead>
                        <TableHead className="text-center font-bold">إجمالي البيع</TableHead>
                        <TableHead className="text-center font-bold">الربح</TableHead>
                        <TableHead className="text-center font-bold">المدفوع</TableHead>
                        <TableHead className="text-center font-bold">الخصم</TableHead>
                        <TableHead className="text-center font-bold">المتبقي</TableHead>
                        <TableHead className="text-center font-bold">الحالة</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                
                     {filteredSubscriptions.length === 0 ? (
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={12} className="h-24 text-center">لا توجد اشتراكات تطابق البحث.</TableCell>
                            </TableRow>
                        </TableBody>
                     ) : (
                        filteredSubscriptions.map(sub => (
                             <SubscriptionRow 
                                key={sub.id}
                                subscription={sub}
                                allInstallments={allInstallments}
                                onDataChange={onDataChange}
                            />
                        ))
                     )}
                 
            </Table>
         </div>
    </div>
  );
}
