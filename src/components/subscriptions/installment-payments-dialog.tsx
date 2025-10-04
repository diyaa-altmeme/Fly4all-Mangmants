
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionInstallment, Payment, Currency, Subscription } from '@/lib/types';
import { Loader2, WalletCards } from 'lucide-react';
import { getInstallmentPayments } from '@/app/subscriptions/actions';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat('en-US').format(amount) + ` ${currency}`;
};

const PaymentsTable = ({ payments, currency }: { payments: Payment[], currency: Currency }) => {
    if (payments.length === 0) {
        return <p className="text-center text-sm text-muted-foreground p-4">لا توجد دفعات مسجلة لهذا القسط.</p>;
    }
    return (
        <div className="border rounded-lg mt-4 bg-background">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>تاريخ الدفع</TableHead>
                        <TableHead>الموظف</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map(p => (
                        <TableRow key={p.id}>
                            <TableCell>{format(parseISO(p.date), 'yyyy-MM-dd HH:mm')}</TableCell>
                            <TableCell>{p.paidBy || 'غير معروف'}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(p.amount, currency)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

interface InstallmentPaymentsDialogProps {
    installment: SubscriptionInstallment;
    subscription: Subscription;
    children: React.ReactNode;
}

export default function InstallmentPaymentsDialog({ installment, subscription, children }: InstallmentPaymentsDialogProps) {
    const [open, setOpen] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            setIsLoading(true);
            getInstallmentPayments(installment.id)
                .then(setPayments)
                .catch(err => toast({ title: 'خطأ', description: 'فشل تحميل الدفعات', variant: 'destructive' }))
                .finally(() => setIsLoading(false));
        }
    }, [open, installment.id, toast]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>كشف حساب القسط</DialogTitle>
                    <DialogDescription>
                        تفاصيل الدفعات المسجلة للقسط المستحق بتاريخ {format(parseISO(installment.dueDate), 'yyyy-MM-dd')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <PaymentsTable payments={payments} currency={installment.currency} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
