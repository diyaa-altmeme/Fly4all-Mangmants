
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Subscription, SubscriptionInstallment, Payment, Currency, SubscriptionStatus, Client, Supplier, User } from '@/lib/types';
import { Button, buttonVariants } from "@/components/ui/button";
import { Settings, History, MessageSquare, Trash2, Loader2, WalletCards, CheckCircle, CircleAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import SubscriptionsSettingsDialog from '@/components/settings/subscriptions-settings';
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
import EditPaymentDialog from './edit-payment-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { produce } from 'immer';
import InvoiceDialog from './invoice-dialog';
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

const InstallmentsTable = ({ installments, subscription, onDataChange }: { installments: SubscriptionInstallment[], subscription: Subscription, onDataChange: () => void }) => {
    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>المدفوع</TableHead>
                        <TableHead>المتبقي</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {installments.map(inst => {
                        const remaining = (inst.amount || 0) - ((inst.paidAmount || 0) + (inst.discount || 0));
                        const isOverdue = isPast(parseISO(inst.dueDate)) && inst.status === 'Unpaid';
                        return (
                            <TableRow key={inst.id}>
                                <TableCell className={cn("font-semibold", isOverdue && "text-destructive")}>
                                    {format(parseISO(inst.dueDate), 'yyyy-MM-dd')}
                                    {isOverdue && <Badge variant="destructive" className="ms-2">متأخر</Badge>}
                                </TableCell>
                                <TableCell>{formatCurrency(inst.amount, inst.currency)}</TableCell>
                                <TableCell className="text-green-600">{formatCurrency(inst.paidAmount || 0, inst.currency)}</TableCell>
                                <TableCell className="font-bold">{formatCurrency(remaining, inst.currency)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("capitalize", installmentStatusStyles[inst.status])}>
                                        {installmentStatusTranslations[inst.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {inst.status === 'Unpaid' && (
                                        <ReceiveInstallmentPaymentDialog installment={inst} subscription={subscription} onPaymentSuccess={onDataChange}>
                                            <Button size="sm">تسديد الدفعة</Button>
                                        </ReceiveInstallmentPaymentDialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

const SubscriptionRow = ({ subscription, allInstallments, onDataChange, clients, suppliers, users }: { 
    subscription: Subscription, 
    allInstallments: SubscriptionInstallment[],
    onDataChange: () => void,
    clients: Client[],
    suppliers: Supplier[],
    users: User[],
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
    
    const totalPaid = subscription.paidAmount || 0;
    const remainingAmount = subscription.salePrice - totalPaid;
    const dynamicStatus: SubscriptionStatus = remainingAmount <= 0.01 && subscription.status !== 'Cancelled' && subscription.status !== 'Suspended' ? 'Paid' : subscription.status;

    const subscriptionInstallments = useMemo(() => 
        Array.isArray(allInstallments) ? allInstallments.filter(inst => inst.subscriptionId === subscription.id).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) : [],
    [allInstallments, subscription.id]);
    
    const totalDiscount = subscriptionInstallments.reduce((sum, inst) => sum + (inst.discount || 0), 0);
    
    const partnerName = useMemo(() => {
        if (!subscription.partnerId) return '-';
        const allRelations = [...clients, ...suppliers];
        const partner = allRelations.find(p => p.id === subscription.partnerId);
        return partner?.name || '-';
    }, [subscription.partnerId, clients, suppliers]);
    
    const enteredByEmployee = useMemo(() => {
        return users.find(u => u.uid === subscription.enteredBy)?.name || subscription.enteredBy || 'غير معروف';
    }, [subscription.enteredBy, users]);


    return (
      <Collapsible asChild>
        <tbody className="border-b">
          <TableRow data-state={isOpen ? "open" : "closed"} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
             <TableCell className="p-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </TableCell>
            <TableCell className="font-semibold">{subscription.invoiceNumber}</TableCell>
            <TableCell>{subscription.purchaseDate ? format(parseISO(subscription.purchaseDate), 'yyyy-MM-dd') : '-'}</TableCell>
            <TableCell>{subscription.serviceName}</TableCell>
            <TableCell>{subscription.clientName}</TableCell>
            <TableCell>{subscription.supplierName}</TableCell>
            <TableCell>{partnerName}</TableCell>
            <TableCell className="text-center font-mono font-bold text-red-600">{formatCurrency(subscription.purchasePrice, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold">{formatCurrency(subscription.salePrice, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-orange-600">{formatCurrency(totalDiscount, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-green-600">{formatCurrency(totalPaid, subscription.currency)}</TableCell>
            <TableCell className="text-center font-mono font-bold text-red-600">{formatCurrency(remainingAmount, subscription.currency)}</TableCell>
            <TableCell className="text-center text-xs">{enteredByEmployee}</TableCell>
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
                <TableCell colSpan={15} className="p-0">
                    <div className="p-2 bg-muted/50">
                        <div className="p-4 bg-background rounded-md">
                        <h4 className="font-semibold mb-2">جدول الدفعات او الاقساط</h4>
                         <InstallmentsTable 
                            installments={subscriptionInstallments}
                            subscription={subscription}
                            onDataChange={onDataChange}
                         />
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
    const { data: navData, loaded: navLoaded } = useVoucherNav();
    
    const filteredSubscriptions = React.useMemo(() => {
        return subscriptions.filter(sub => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? 
                sub.serviceName.toLowerCase().includes(searchTermLower) || 
                sub.clientName.toLowerCase().includes(searchTermLower) || 
                (sub.supplierName || '').toLowerCase().includes(searchTermLower) ||
                (sub.invoiceNumber || '').toLowerCase().includes(searchTermLower)
                : true;
            
            const remainingAmount = sub.salePrice - (sub.paidAmount || 0);
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
                        <TableHead className="font-bold">تاريخ الاشتراك</TableHead>
                        <TableHead className="font-bold">الاشتراك</TableHead>
                        <TableHead className="font-bold">العميل</TableHead>
                        <TableHead className="font-bold">المورد</TableHead>
                        <TableHead className="font-bold">الشريك</TableHead>
                        <TableHead className="text-center font-bold">إجمالي الشراء</TableHead>
                        <TableHead className="text-center font-bold">إجمالي البيع</TableHead>
                        <TableHead className="text-center font-bold">الخصم</TableHead>
                        <TableHead className="text-center font-bold">المدفوع</TableHead>
                        <TableHead className="text-center font-bold">المتبقي</TableHead>
                        <TableHead className="text-center font-bold">موظف الإدخال</TableHead>
                        <TableHead className="text-center font-bold">الحالة</TableHead>
                        <TableHead className="text-center font-bold">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                
                     {filteredSubscriptions.length === 0 ? (
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={15} className="h-24 text-center">لا توجد اشتراكات تطابق البحث.</TableCell>
                            </TableRow>
                        </TableBody>
                     ) : (
                        filteredSubscriptions.map(sub => (
                             <SubscriptionRow 
                                key={sub.id}
                                subscription={sub}
                                allInstallments={allInstallments}
                                onDataChange={onDataChange}
                                clients={navData?.clients || []}
                                suppliers={navData?.suppliers || []}
                                users={navData?.users || []}
                            />
                        ))
                     )}
                 
            </Table>
         </div>
    </div>
  );
}
