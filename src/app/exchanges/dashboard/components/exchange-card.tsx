
"use client";

import React, { useState } from 'react';
import type { Exchange, ExchangeDashboardData, UnifiedLedgerEntry } from '../../actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitCompareArrows, ArrowUp, ArrowDown, PlusCircle, RefreshCw, Loader2, Share2, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import AddTransactionsDialog from '../../components/add-transactions-dialog';
import AddPaymentsDialog from '../../components/add-payments-dialog';
import { useToast } from '@/hooks/use-toast';
import ShareBalanceDialog from './ShareBalanceDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const formatCurrency = (amount: number, withSign = false) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    const sign = amount < 0 ? "-" : (withSign ? "+" : "");
    const formattedAmount = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${sign}$${formattedAmount}`;
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
    return (
        <Card className="flex flex-col shadow-md overflow-hidden rounded-xl">
             <CardHeader 
                className="p-4 flex flex-row items-center justify-between gap-4 text-primary-foreground border-b"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
             >
                 <Badge variant={exchange.balance < 0 ? "destructive" : "default"} className={cn("text-lg font-mono", exchange.balance < 0 ? "bg-red-500" : "bg-green-600 hover:bg-green-700")}>
                    {formatCurrency(exchange.balance)}
                </Badge>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <CardTitle className="text-lg font-bold">{exchange.name}</CardTitle>
                         <CardDescription className="text-xs font-semibold text-primary-foreground/80">الرصيد الحالي</CardDescription>
                    </div>
                     <div className="p-3 bg-primary-foreground/20 rounded-full border-2 border-primary-foreground/30 shadow-sm">
                       <GitCompareArrows className="h-6 w-6" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1 p-4">
                {exchange.lastTransactions.length === 0 ? (
                    <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                        لا توجد حركات حديثة.
                    </div>
                ) : exchange.lastTransactions.map((tx, index) => {
                    const isDebit = tx.entryType === 'transaction' || tx.totalAmount! < 0;
                    const amount = tx.totalAmount || 0;

                    return (
                        <React.Fragment key={tx.id}>
                            <div className="flex items-center gap-4 py-3">
                                <div className={cn("flex-shrink-0 size-8 rounded-full flex items-center justify-center", isDebit ? "bg-red-100" : "bg-green-100")}>
                                    {isDebit ? <ArrowDown className="h-5 w-5 text-red-500" /> : <ArrowUp className="h-5 w-5 text-green-500" />}
                                </div>
                                <div className="flex-grow text-right space-y-1 overflow-hidden">
                                    <p className="text-sm font-semibold truncate" title={tx.description}>{tx.description}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{format(parseISO(tx.date), 'MMM d, yyyy')}</p>
                                </div>
                                <div className={cn("font-mono font-bold text-sm text-nowrap", isDebit ? 'text-red-600' : 'text-green-600')}>
                                    {formatCurrency(amount, true)}
                                </div>
                            </div>
                            {index < exchange.lastTransactions.length - 1 && <Separator />}
                        </React.Fragment>
                    )
                })}
            </CardContent>
            <CardFooter className="p-2 border-t bg-muted/50 flex flex-col gap-2">
                 <div className="grid grid-cols-2 gap-2 w-full">
                     <Button asChild className="w-full" variant="ghost">
                        <Link href={`/exchanges?exchangeId=${exchange.id}`}>
                            عرض الكشف الكامل <ArrowLeft className="ms-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <ShareBalanceDialog exchangeName={exchange.name} balance={exchange.balance}>
                         <Button className="w-full" variant="ghost">
                            <Share2 className="me-2 h-4 w-4" /> مشاركة الرصيد
                        </Button>
                    </ShareBalanceDialog>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full">
                     <AddTransactionsDialog exchangeId={exchange.id} exchanges={exchanges} onSuccess={onRefresh}>
                        <Button className="w-full" variant="secondary" size="sm">
                            <PlusCircle className="me-2 h-4 w-4" /> معاملة
                        </Button>
                     </AddTransactionsDialog>
                      <AddPaymentsDialog exchangeId={exchange.id} exchanges={exchanges} onSuccess={onRefresh}>
                         <Button className="w-full" variant="secondary" size="sm">
                            <PlusCircle className="me-2 h-4 w-4" /> تسديد
                        </Button>
                     </AddPaymentsDialog>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                        {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
