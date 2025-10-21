
"use client";

import React, { useState } from 'react';
import type { ExchangeDashboardData, UnifiedLedgerEntry } from '@/app/exchanges/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitCompareArrows, ArrowUp, ArrowDown, PlusCircle, RefreshCw, Loader2, Share2, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import AddTransactionsDialog from './add-transactions-dialog';
import AddPaymentsDialog from './add-payments-dialog';
import { useToast } from '@/hooks/use-toast';
import ShareBalanceDialog from './ShareBalanceDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Exchange } from '@/lib/types';

const formatCurrency = (amount: number, withSign = false) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    const sign = amount < 0 ? "-" : (withSign ? "+" : "");
    const formattedAmount = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${sign}$${formattedAmount}`;
};

const formatCurrencyForCard = (amount: number) => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${''}${formatted}${isNegative ? '-' : '+'}`;
};


export const ExchangeCard = ({ exchange, exchanges, onRefresh }: { exchange: ExchangeDashboardData, exchanges: Exchange[], onRefresh: () => void }) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const { toast } = useToast();

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsRefreshing(true);
        try {
            await onRefresh();
            toast({ title: `تم تحديث بيانات ${exchange.name}`});
        } catch (error) {
            toast({ title: 'فشل التحديث', variant: 'destructive'});
        } finally {
            setIsRefreshing(false);
        }
    }
    
    const balanceIsDebt = exchange.balance < 0;

    return (
        <Card className="flex flex-col shadow-md overflow-hidden rounded-xl bg-card">
             <CardHeader 
                className="relative p-4 flex flex-col items-stretch gap-4 text-primary-foreground rounded-t-xl border-b-4 border-black/10"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
             >
                <div className="flex justify-between items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-background/20 text-white" onClick={handleRefresh} disabled={isRefreshing}>
                        {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                    </Button>
                    <div className="text-right">
                        <CardTitle className="text-lg font-bold">{exchange.name}</CardTitle>
                        <CardDescription className="text-xs font-semibold text-primary-foreground/80">بورصة السوق</CardDescription>
                    </div>
                     <div className="p-2 bg-primary-foreground/20 rounded-full border-2 border-primary-foreground/30 shadow-sm">
                       <GitCompareArrows className="h-5 w-5" />
                    </div>
                </div>
                 <div className="p-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/20 text-center">
                    <p className="text-xs font-bold text-white/80">الرصيد الحالي</p>
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-3xl font-mono font-bold tracking-wider">{formatCurrencyForCard(exchange.balance)}</p>
                        <Badge variant="destructive" className={cn(balanceIsDebt ? "bg-red-500/80" : "bg-green-500/80")}>{balanceIsDebt ? "دين" : "لنا"}</Badge>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1 p-2">
                 <div className="px-2 py-1">
                    <p className="font-bold text-sm text-right">آخر الحركات</p>
                </div>
                {exchange.lastTransactions.length === 0 ? (
                    <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                        لا توجد حركات حديثة.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right p-1 h-8">البيان</TableHead>
                                <TableHead className="text-center p-1 h-8">المبلغ</TableHead>
                                <TableHead className="text-center p-1 h-8">الرصيد</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {exchange.lastTransactions.map((tx) => {
                            const isDebit = tx.entryType === 'transaction' || tx.totalAmount! < 0;
                            const amount = tx.totalAmount || 0;
                            return (
                                <TableRow key={tx.id}>
                                    <TableCell className="p-1 text-xs text-right truncate font-semibold" title={tx.description}>
                                        {tx.description}
                                        <div className="text-muted-foreground font-mono">{format(parseISO(tx.date), 'yyyy-MM-dd')}</div>
                                    </TableCell>
                                    <TableCell className={cn("p-1 text-center font-mono font-bold text-xs", isDebit ? "text-red-500" : "text-green-500")}>
                                        {formatCurrency(amount, true)}
                                    </TableCell>
                                    <TableCell className={cn("p-1 text-center font-mono text-xs", (tx.balance || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                                        {formatCurrency(tx.balance)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
            <CardFooter className="p-2 border-t bg-muted/20 grid grid-cols-2 gap-2">
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={`/exchanges/report?exchangeId=${exchange.id}`}>
                        عرض الكشف الكامل <ArrowLeft className="ms-2 h-4 w-4" />
                    </Link>
                </Button>
                <ShareBalanceDialog exchangeName={exchange.name} balance={exchange.balance}>
                    <Button className="w-full" variant="outline">
                        <Share2 className="me-2 h-4 w-4" /> مشاركة الرصيد
                    </Button>
                </ShareBalanceDialog>
                <AddTransactionsDialog exchangeId={exchange.id} exchanges={exchanges} onSuccess={onRefresh}>
                    <Button className="w-full" variant="outline">
                        <PlusCircle className="me-2 h-4 w-4" /> معاملة جديدة
                    </Button>
                </AddTransactionsDialog>
                <AddPaymentsDialog exchangeId={exchange.id} exchanges={exchanges} onSuccess={onRefresh}>
                    <Button className="w-full" variant="outline">
                        <PlusCircle className="me-2 h-4 w-4" /> تسديد جديد
                    </Button>
                </AddPaymentsDialog>
            </CardFooter>
        </Card>
    );
};
