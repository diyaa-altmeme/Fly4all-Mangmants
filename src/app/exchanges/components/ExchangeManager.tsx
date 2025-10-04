
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Exchange, UnifiedLedgerEntry, ExchangeTransaction, ExchangePayment } from '@/lib/types';
import { getUnifiedExchangeLedger, getExchanges, deleteExchangeTransactionBatch, deleteExchangePaymentBatch, updateBatch } from '../actions';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2, ChevronDown, Calendar as CalendarIcon, Filter, GitCompareArrows, Search, UserPlus, ArrowUpDown, RefreshCw, Download } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from './add-exchange-dialog';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import EditBatchDialog from "./EditBatchDialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { produce } from 'immer';
import * as XLSX from 'xlsx';


interface ExchangeManagerProps {
    initialExchanges: Exchange[];
    initialExchangeId: string;
}

const formatCurrency = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
}

const StatCard = ({ title, value, currency, className, arrow }: { title: string; value: number; currency: string; className?: string, arrow?: 'up' | 'down' }) => (
    <div className={cn("text-center p-2 rounded-lg bg-background", className)}>
        <p className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1">
             {arrow === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
             {arrow === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
            {title}
        </p>
        <p className={cn("font-bold font-mono text-base")}>
            {(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
        </p>
    </div>
);

const LedgerRow = ({ entry, index, exchanges, onActionSuccess }: { entry: UnifiedLedgerEntry; index: number; exchanges: Exchange[]; onActionSuccess: (action: 'update' | 'delete' | 'add', data: any) => void }) => {
    const { toast } = useToast();
    const [isConfirmed, setIsConfirmed] = useState(entry.isConfirmed || false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setIsConfirmed(entry.isConfirmed || false);
    }, [entry.isConfirmed]);


    const handleConfirmChange = async (checked: boolean) => {
        setIsConfirmed(checked); // Optimistic update
        
        const result = await updateBatch(entry.id, entry.entryType as 'transaction' | 'payment', { isConfirmed: checked });
        if (!result.success) {
            toast({ title: "خطأ", description: "فشل تحديث حالة التأكيد.", variant: "destructive" });
             setIsConfirmed(!checked); // Revert on failure
        } else {
             toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
        }
    };
    
    const handleDelete = async () => {
        const { id, entryType } = entry;
        const action = entryType === 'transaction' ? deleteExchangeTransactionBatch : deleteExchangePaymentBatch;
        const result = await action(id);
        if (result.success && result.deletedId) {
            toast({ title: "تم الحذف بنجاح" });
            onActionSuccess('delete', { id: result.deletedId });
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
    };
    
    const amount = entry.totalAmount || 0;
    const onUsAmount = entry.entryType === 'transaction' ? Math.abs(amount) : (amount < 0 ? Math.abs(amount) : 0);
    const forUsAmount = entry.entryType === 'payment' && amount > 0 ? amount : 0;
    
    const exchangeName = exchanges.find(ex => ex.id === entry.exchangeId)?.name || 'غير معروف';
    
    const getPaymentBadge = () => {
        if (entry.entryType === 'transaction') {
            return <Badge variant="destructive">دين</Badge>;
        }

        const details = entry.details as ExchangePayment[];
        const hasPayments = details.some(d => d.type === 'payment');
        const hasReceipts = details.some(d => d.type === 'receipt');

        if (hasPayments && !hasReceipts) {
            return <Badge className="bg-blue-500 hover:bg-blue-600">دفع</Badge>;
        }
        if (!hasPayments && hasReceipts) {
            return <Badge className="bg-green-500 hover:bg-green-600">قبض</Badge>;
        }
        return <Badge variant="secondary">تسديد/قبض</Badge>;
    };

    return (
        <Collapsible asChild key={entry.id}>
          <tbody className="border-t">
            <TableRow>
                <TableCell className="p-2 text-center font-mono">{index + 1}</TableCell>
                <TableCell className="p-2 text-center"><Checkbox checked={isConfirmed} onCheckedChange={(c) => handleConfirmChange(!!c)} /></TableCell>
                <TableCell className="p-1 text-center">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:rotate-180">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </TableCell>
                <TableCell className="p-2 font-mono text-sm text-center">{entry.invoiceNumber}</TableCell>
                <TableCell className="p-2 text-sm text-center">{entry.date}</TableCell>
                <TableCell className="p-2 font-mono text-sm text-center">{format(parseISO(entry.createdAt), 'HH:mm')}</TableCell>
                <TableCell className="p-2 text-center">{getPaymentBadge()}</TableCell>
                <TableCell className="p-2 text-sm text-right whitespace-pre-wrap">{entry.description}</TableCell>
                <TableCell className="p-2 font-mono text-sm text-center text-red-600">{onUsAmount > 0 ? formatCurrency(onUsAmount, 'USD') : '-'}</TableCell>
                <TableCell className="p-2 font-mono text-sm text-center text-green-600">{forUsAmount > 0 ? formatCurrency(forUsAmount, 'USD') : '-'}</TableCell>
                <TableCell className={cn("p-2 font-mono text-sm text-center font-bold", (entry.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(entry.balance, 'USD')}</TableCell>
                <TableCell className="p-2 text-sm text-center">{entry.userName}</TableCell>
                <TableCell className="p-1 text-center">
                   <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <EditBatchDialog batch={entry} exchanges={exchanges} onSuccess={(updatedBatch) => onActionSuccess('update', updatedBatch)}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={isConfirmed}><Edit className="me-2 h-4 w-4" />تعديل</DropdownMenuItem>
                            </EditBatchDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive" disabled={isConfirmed}>
                                        <Trash2 className="me-2 h-4 w-4" /> حذف
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيؤدي هذا لحذف الدفعة وجميع الحركات المرتبطة بها.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>نعم، قم بالحذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <tr>
                    <TableCell colSpan={13} className="p-0">
                        <div className="p-2 bg-muted/50">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="p-2 text-right">الطرف</TableHead>
                                        <TableHead className="p-2 text-right">بواسطة</TableHead>
                                        <TableHead className="p-2 text-center">النوع</TableHead>
                                        <TableHead className="p-2 text-right">المبلغ الأصلي</TableHead>
                                        <TableHead className="p-2 text-right">سعر الصرف</TableHead>
                                        <TableHead className="p-2 text-right">المعادل بالدولار</TableHead>
                                        <TableHead className="p-2 text-right">ملاحظات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(entry.details || []).map((detail: any, index: number) => {
                                        let typeLabel = '';
                                        let typeClass = '';
                                        
                                        if (entry.entryType === 'transaction') {
                                            typeLabel = 'دين';
                                            typeClass = 'destructive';
                                        } else {
                                            if (detail.type === 'payment') {
                                                typeLabel = 'دفع';
                                                typeClass = 'bg-blue-500';
                                            } else if (detail.type === 'receipt') {
                                                typeLabel = 'قبض';
                                                typeClass = 'bg-green-500';
                                            }
                                        }

                                        return (
                                        <TableRow key={index} className="bg-background/50">
                                            <TableCell className="p-2 text-right">{detail.partyName || detail.paidTo}</TableCell>
                                            <TableCell className="p-2 text-right">{entry.entryType === 'transaction' ? exchangeName : (detail.intermediary || entry.userName)}</TableCell>
                                            <TableCell className="p-2 text-center"><Badge variant={typeClass === 'destructive' ? 'destructive' : 'default'} className={cn(typeClass)}>{typeLabel}</Badge></TableCell>
                                            <TableCell className="p-2 font-mono text-right">{detail.originalAmount.toLocaleString()} {detail.originalCurrency}</TableCell>
                                            <TableCell className="p-2 font-mono text-right">{detail.rate}</TableCell>
                                            <TableCell className="p-2 font-mono text-right font-bold">{formatCurrency(detail.amountInUSD, 'USD')}</TableCell>
                                            <TableCell className="p-2 text-right">{detail.note}</TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    </TableCell>
                </tr>
            </CollapsibleContent>
          </tbody>
        </Collapsible>
    );
};


export default function ExchangeManager({ initialExchanges, initialExchangeId }: ExchangeManagerProps) {
  const { toast } = useToast();
  const [exchangeId, setExchangeId] = useState<string>(initialExchangeId || initialExchanges[0]?.id || "");
  const [exchanges, setExchanges] = useState<Exchange[]>(initialExchanges);
  const [unifiedLedger, setUnifiedLedger] = useState<UnifiedLedgerEntry[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 30),
      to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });


  const fetchExchangeData = useCallback(async () => {
    if (exchangeId) {
      setLoading(true);
      try {
        const ledgerData = await getUnifiedExchangeLedger(exchangeId, date?.from, date?.to);
        setUnifiedLedger(ledgerData);
      } catch (err: any) {
        toast({ title: 'خطأ في تحميل البيانات', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  }, [exchangeId, date, toast]);

  useEffect(() => {
    fetchExchangeData();
  }, [fetchExchangeData]);
  
  useEffect(() => {
      setExchangeId(initialExchangeId || initialExchanges[0]?.id || "");
  }, [initialExchangeId, initialExchanges]);

    const refreshAllData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getExchanges();
            if (result.accounts) {
                const currentExchanges = result.accounts;
                setExchanges(currentExchanges);
                const currentSelectionIsValid = currentExchanges.some(ex => ex.id === exchangeId);
                if (!currentSelectionIsValid && currentExchanges.length > 0) {
                    setExchangeId(currentExchanges[0].id);
                } else if (currentExchanges.length === 0) {
                    setExchangeId("");
                    setUnifiedLedger([]);
                } else {
                    await fetchExchangeData();
                }
            } else {
                 toast({ title: "خطأ", description: "فشل تحديث قائمة البورصات.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: 'خطأ في تحديث البيانات', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [exchangeId, fetchExchangeData, toast]);

    const handleActionSuccess = useCallback((action: 'update' | 'delete' | 'add', data: any) => {
        let newLedger: UnifiedLedgerEntry[];
        if (action === 'delete') {
            newLedger = unifiedLedger.filter(entry => entry.id !== data.id);
        } else if (action === 'update') {
            newLedger = unifiedLedger.map(entry => entry.id === data.id ? { ...entry, ...data } : entry);
        } else { // 'add'
            newLedger = [data, ...unifiedLedger];
        }

        newLedger.sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
        
        let runningBalance = 0;
        const entriesWithBalance = newLedger.map(entry => {
            const amount = entry.totalAmount || 0;
            runningBalance += amount;
            return { ...entry, balance: runningBalance };
        });

        setUnifiedLedger(entriesWithBalance.reverse());
    }, [unifiedLedger]);

 const filteredLedger = useMemo(() => {
    let processed = [...unifiedLedger];
    
    if (debouncedSearchTerm) {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        processed = processed.filter(entry => {
            return (
                entry.invoiceNumber?.toLowerCase().includes(lowercasedTerm) ||
                entry.description?.toLowerCase().includes(lowercasedTerm) ||
                entry.userName?.toLowerCase().includes(lowercasedTerm) ||
                (Array.isArray(entry.details) && entry.details.some(
                    (detail: any) =>
                        (detail.partyName && detail.partyName.toLowerCase().includes(lowercasedTerm)) ||
                        (detail.paidTo && detail.paidTo.toLowerCase().includes(lowercasedTerm)) ||
                        (detail.note && detail.note.toLowerCase().includes(lowercasedTerm))
                ))
            );
        });
    }

    processed.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        
        if (sortConfig.direction === 'asc') {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });

    return processed;
}, [unifiedLedger, debouncedSearchTerm, sortConfig]);

    const { totalDebitsUSD, totalCreditsUSD, netBalanceUSD } = useMemo(() => {
        const totals = filteredLedger.reduce((acc, entry) => {
            const amount = entry.totalAmount || 0;
            if(entry.entryType === 'transaction') {
                acc.totalDebitsUSD += Math.abs(amount);
            } else if (entry.entryType === 'payment') {
                const paymentDetails = entry.details as ExchangePayment[];
                const paymentTotal = paymentDetails.reduce((sum, p) => sum + p.amountInUSD, 0);
                 if(paymentTotal > 0) {
                    acc.totalCreditsUSD += paymentTotal;
                } else {
                    acc.totalDebitsUSD += Math.abs(paymentTotal);
                }
            }
            return acc;
        }, { totalDebitsUSD: 0, totalCreditsUSD: 0 });

        return { ...totals, netBalanceUSD: totals.totalCreditsUSD - totals.totalDebitsUSD };
    }, [filteredLedger]);
  
    const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };
  
    const handleExport = () => {
    if (filteredLedger.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    
    const dataToExport = filteredLedger.flatMap(entry =>
      (entry.details || []).map((detail: any) => ({
        'رقم الفاتورة': entry.invoiceNumber,
        'تاريخ الفاتورة': entry.date,
        'نوع الدفعة': entry.entryType === 'transaction' ? 'معاملة' : 'تسديد/قبض',
        'نوع الحركة': entry.entryType === 'transaction' ? 'دين' : detail.type,
        'الطرف': detail.partyName || detail.paidTo,
        'الوسيط': entry.entryType === 'payment' ? detail.intermediary : entry.userName,
        'المبلغ الأصلي': detail.originalAmount,
        'العملة الأصلية': detail.originalCurrency,
        'سعر الصرف': detail.rate,
        'المبلغ بالدولار': detail.amountInUSD,
        'ملاحظات': detail.note,
        'تاريخ الإنشاء': format(parseISO(entry.createdAt), 'yyyy-MM-dd HH:mm'),
        'المستخدم': entry.userName,
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    
    const exchangeName = exchanges.find(ex => ex.id === exchangeId)?.name || 'exchange';
    XLSX.writeFile(workbook, `ExchangeLedger_${exchangeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex w-full flex-col items-start gap-4">
                        <div>
                            <CardTitle>إدارة البورصات والمعاملات</CardTitle>
                            <CardDescription>
                                نظام تفاعلي لإدارة المعاملات اليومية للبورصات، وتسجيل الدفعات، ومتابعة الأرصدة.
                            </CardDescription>
                        </div>
                        <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Select value={exchangeId} onValueChange={(e) => setExchangeId(e)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="اختر بورصة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exchanges.map((x) => (
                                            <SelectItem key={x.id} value={x.id}>
                                                {x.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full sm:w-[250px] justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (
                                                date.to ? (
                                                    <>
                                                        {format(date.from, "LLL dd, y")} -{" "}
                                                        {format(date.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(date.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>اختر فترة</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="بحث شامل..."
                                    className="ps-10"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <AddTransactionsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={(b) => handleActionSuccess('add', b)}>
                                    <Button className="w-full"><PlusCircle className="me-2 h-4 w-4" />معاملة</Button>
                                </AddTransactionsDialog>
                                <AddPaymentsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={(b) => handleActionSuccess('add', b)}>
                                     <Button className="w-full" variant="secondary"><PlusCircle className="me-2 h-4 w-4" />تسديد</Button>
                                </AddPaymentsDialog>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal/></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={handleExport}><Download className="me-2 h-4 w-4"/>تصدير Excel</DropdownMenuItem>
                                        <AddExchangeDialog onSuccess={refreshAllData}>
                                            <DropdownMenuItem onSelect={e => e.preventDefault()}><PlusCircle className="me-2 h-4 w-4" />إدارة البورصات</DropdownMenuItem>
                                        </AddExchangeDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline" size="icon" onClick={refreshAllData} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-4 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <StatCard title="إجمالي علينا (معاملات)" value={totalDebitsUSD} currency="USD" className="border-red-500/30" arrow="down" />
                            <StatCard title="إجمالي لنا (تسديدات)" value={totalCreditsUSD} currency="USD" className="border-green-500/30" arrow="up" />
                            <StatCard title="الرصيد النهائي" value={netBalanceUSD} currency="USD" className={cn("border-blue-500/30 font-bold", netBalanceUSD >= 0 ? 'text-green-600' : 'text-red-600')} />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader><CardTitle>سجل البورصة الموحد</CardTitle></CardHeader>
                <CardContent className="pt-0">
                    {loading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="p-2 text-center">#</TableHead>
                                        <TableHead className="p-2 text-center">تأكيد</TableHead>
                                        <TableHead className="w-[40px] p-2"></TableHead>
                                        <TableHead className="p-2 text-center">رقم الفاتورة</TableHead>
                                        <TableHead className="p-2 text-center">
                                            <Button variant="ghost" className="p-0 h-auto font-bold" onClick={() => handleSort('createdAt')}>
                                                التاريخ <ArrowUpDown className="ms-2 h-4 w-4"/>
                                            </Button>
                                        </TableHead>
                                        <TableHead className="p-2 text-center">الوقت</TableHead>
                                        <TableHead className="p-2 text-center">النوع</TableHead>
                                        <TableHead className="p-2 text-right w-[30%]">الوصف</TableHead>
                                        <TableHead className="p-2 text-center text-red-600 font-semibold">علينا</TableHead>
                                        <TableHead className="p-2 text-center text-green-600 font-semibold">لنا</TableHead>
                                        <TableHead className={cn("p-2 text-center font-bold")}>المحصلة</TableHead>
                                        <TableHead className="p-2 text-center">المستخدم</TableHead>
                                        <TableHead className="text-center p-2">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                
                                    {filteredLedger.length === 0 ? (
                                        <TableBody>
                                            <TableRow><TableCell colSpan={13} className="text-center h-24">لا توجد بيانات لهذه الفترة.</TableCell></TableRow>
                                        </TableBody>
                                    ) : filteredLedger.map((entry, index) => <LedgerRow key={entry.id} entry={entry} index={index} exchanges={exchanges} onActionSuccess={handleActionSuccess} /> )}
                                
                            </Table>
                        </div>
                    }
                </CardContent>
            </Card>
        </div>
    );
}
