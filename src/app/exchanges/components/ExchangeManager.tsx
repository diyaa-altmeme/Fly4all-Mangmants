
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { Exchange, UnifiedLedgerEntry, ExchangeTransaction, ExchangePayment } from '@/lib/types';
import { getUnifiedExchangeLedger, getExchanges, deleteExchangeTransactionBatch, deleteExchangePaymentBatch, updateBatch } from '../actions';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2, ChevronDown, Calendar as CalendarIcon, Filter, GitCompareArrows, Search, UserPlus, ArrowUpDown, RefreshCw, Download, CheckCheck } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO } from "date-fns";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from './add-exchange-dialog';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditBatchDialog from "./EditBatchDialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { produce } from 'immer';
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState, getFilteredRowModel } from '@tanstack/react-table';

interface ExchangeManagerProps {
    initialExchanges: Exchange[];
    initialExchangeId: string;
}

const formatCurrency = (amount?: number, currency: string = 'USD') => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
}

const StatCard = ({ title, value, currency, className, arrow }: { title: string; value: number; currency: string; className?: string, arrow?: 'up' | 'down' }) => (
    <div className={cn("text-center p-3 rounded-lg border", className)}>
        <p className="text-sm text-muted-foreground font-bold flex items-center justify-center gap-1">
             {arrow === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
             {arrow === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
            {title}
        </p>
        <p className={cn("font-bold font-mono text-xl")}>
            {(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
        </p>
    </div>
);

const LedgerRow = ({ row, index, exchanges, onActionSuccess }: { row: any; index: number; exchanges: Exchange[]; onActionSuccess: (action: 'update' | 'delete' | 'add', data: any) => void }) => {
    const entry = row.original as UnifiedLedgerEntry;
    const { toast } = useToast();
    const [isConfirmed, setIsConfirmed] = useState(entry.isConfirmed || false);
    const [isOpen, setIsOpen] = useState(false);

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
            onActionSuccess('update', { ...entry, isConfirmed: checked });
        }
    };
    
    return (
        <React.Fragment>
            <TableRow data-state={isOpen ? "open" : "closed"} className={cn(isConfirmed && "bg-green-500/10")}>
                {row.getVisibleCells().map((cell: any) => {
                    if (cell.column.id === 'collapsible') {
                        return (
                            <TableCell key={cell.id} className="p-1 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                                </Button>
                            </TableCell>
                        );
                    }
                    return (
                        <TableCell key={cell.id} className="p-2 font-bold" style={{ width: cell.column.getSize() }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    );
                })}
            </TableRow>
            {isOpen && (
                 <TableRow>
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
                                            <TableCell className="p-2 text-right">{entry.entryType === 'transaction' ? (exchanges.find(ex => ex.id === entry.exchangeId)?.name || 'غير معروف') : (detail.intermediary || entry.userName)}</TableCell>
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
                </TableRow>
            )}
        </React.Fragment>
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
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'transaction' | 'payment'>('all');
  const [confirmationFilter, setConfirmationFilter] = useState<'all' | 'confirmed' | 'unconfirmed'>('all');
  
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 30,
  });

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

        newLedger.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        
        let runningBalance = 0;
        const reversedForBalance = [...newLedger].reverse();
        const entriesWithBalance = reversedForBalance.map(entry => {
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

    if (typeFilter !== 'all') {
        processed = processed.filter(entry => entry.entryType === typeFilter);
    }

    if (confirmationFilter !== 'all') {
        processed = processed.filter(entry => (confirmationFilter === 'confirmed') ? entry.isConfirmed : !entry.isConfirmed);
    }
    
    return processed;
}, [unifiedLedger, debouncedSearchTerm, typeFilter, confirmationFilter]);

    const { totalDebitsUSD, totalCreditsUSD } = useMemo(() => {
        return filteredLedger.reduce((acc, entry) => {
            const amount = entry.totalAmount || 0;
            if (entry.entryType === 'transaction') {
                acc.totalDebitsUSD += Math.abs(amount);
            } else if(entry.entryType === 'payment') {
                if (amount > 0) acc.totalCreditsUSD += amount; // Payment to them
                else acc.totalDebitsUSD += Math.abs(amount); // Receipt from them
            }
            return acc;
        }, { totalDebitsUSD: 0, totalCreditsUSD: 0 });
    }, [filteredLedger]);

    const netBalanceUSD = filteredLedger.length > 0 ? (filteredLedger[0]?.balance || 0) : 0;
    
    const handleExport = () => {
        if (filteredLedger.length === 0) {
          toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
          return;
        }
        const dataToExport = filteredLedger.map(entry => ({
          'رقم الفاتورة': entry.invoiceNumber || 'N/A',
          'التاريخ': entry.date,
          'الوقت': format(parseISO(entry.createdAt), 'HH:mm'),
          'النوع': entry.entryType === 'transaction' ? 'دين' : 'تسديد',
          'الوصف': entry.description,
          'علينا (مدين)': entry.entryType === 'transaction' ? Math.abs(entry.totalAmount || 0) : (entry.totalAmount && entry.totalAmount < 0 ? Math.abs(entry.totalAmount) : 0),
          'لنا (دائن)': entry.entryType === 'payment' && (entry.totalAmount || 0) > 0 ? entry.totalAmount : 0,
          'الرصيد': entry.balance,
          'المستخدم': entry.userName,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "كشف حساب بورصة");
        const exchangeName = exchanges.find(ex => ex.id === exchangeId)?.name || 'exchange';
        XLSX.writeFile(wb, `Statement-${exchangeName.replace(/:/g, '')}-${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "تم التصدير بنجاح" });
    };

    const columns: ColumnDef<UnifiedLedgerEntry>[] = useMemo(() => [
        { id: 'collapsible', header: '', size: 40, cell: ({ row }) => (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => row.toggleSelected(!row.getIsSelected())}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", row.getIsSelected() && "rotate-180")} />
            </Button>
        )},
        { id: 'index', header: '#', size: 40, cell: ({ row }) => row.index + 1 },
        { id: 'isConfirmed', header: 'تأكيد', size: 50, cell: ({ row }) => {
            const entry = row.original;
            const [isConfirmed, setIsConfirmedState] = useState(entry.isConfirmed || false);
            const handleConfirmChange = async (checked: boolean) => {
                setIsConfirmedState(checked);
                const result = await updateBatch(entry.id, entry.entryType as 'transaction' | 'payment', { isConfirmed: checked });
                if (!result.success) {
                    toast({ title: "خطأ", description: "فشل تحديث حالة التأكيد.", variant: "destructive" });
                    setIsConfirmedState(!checked);
                } else {
                    toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
                    handleActionSuccess('update', { ...entry, isConfirmed: checked });
                }
            };
            return <Checkbox checked={isConfirmed} onCheckedChange={handleConfirmChange} />;
        }},
        { accessorKey: 'invoiceNumber', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الفاتورة <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, cell: ({ row }) => row.original.invoiceNumber },
        { accessorKey: 'date', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>التاريخ <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, cell: ({ row }) => format(parseISO(row.original.date), 'yyyy-MM-dd') },
        { accessorKey: 'createdAt', header: 'الوقت', cell: ({ row }) => format(parseISO(row.original.createdAt), 'HH:mm') },
        { accessorKey: 'entryType', header: 'النوع', cell: ({ row }) => row.original.entryType === 'transaction' ? 'دين' : 'تسديد' },
        { accessorKey: 'description', header: 'الوصف', size: 250 },
        { id: 'debit', header: 'علينا', cell: ({ row }) => {
            const entry = row.original;
            const amount = entry.totalAmount || 0;
            const debit = entry.entryType === 'transaction' ? Math.abs(amount) : (amount < 0 ? Math.abs(amount) : 0);
            return <div className="font-bold text-red-600">{debit > 0 ? formatCurrency(debit, 'USD') : '-'}</div>;
        }},
        { id: 'credit', header: 'لنا', cell: ({ row }) => {
            const entry = row.original;
            const amount = entry.totalAmount || 0;
            const credit = entry.entryType === 'payment' && amount > 0 ? amount : 0;
            return <div className="font-bold text-green-600">{credit > 0 ? formatCurrency(credit, 'USD') : '-'}</div>;
        }},
        { accessorKey: 'balance', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>المحصلة <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, cell: ({ row }) => formatCurrency(row.original.balance, 'USD') },
        { accessorKey: 'userName', header: 'المستخدم' },
        { id: 'actions', header: 'الإجراءات', cell: ({ row }) => <LedgerRowActions entry={row.original} onActionSuccess={handleActionSuccess} exchanges={exchanges}/> },
    ], [exchanges, handleActionSuccess, toast]);

    const table = useReactTable({
      data: filteredLedger,
      columns,
      state: { sorting, pagination },
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      manualPagination: false, 
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex w-full flex-col items-start gap-4">
                        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                             <div className="md:col-span-1 space-y-1">
                                <Label htmlFor="exchange-select" className="font-bold">البورصة:</Label>
                                <Select value={exchangeId} onValueChange={(e) => setExchangeId(e)}>
                                    <SelectTrigger className="w-full h-9">
                                        <SelectValue placeholder="اختر بورصة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exchanges.map((x) => (
                                            <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-3 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <StatCard title="إجمالي مطلوب لنا" usd={summary.totalCreditUSD} iqd={summary.totalCreditIQD} className="border-green-500/50 bg-green-50 dark:bg-green-950/30" />
                                <StatCard title="إجمالي مطلوب منا" usd={summary.totalDebitUSD} iqd={summary.totalDebitIQD} className="border-red-500/50 bg-red-50 dark:bg-red-950/30" />
                                <StatCard title="صافي الرصيد" usd={netBalanceUSD} iqd={netBalanceIQD} className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>سجل البورصة الموحد</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
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
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                        <div className="relative flex-grow w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="بحث شامل في النتائج..." className="pr-10 h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                         <div className="flex gap-2 w-full sm:w-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (date.to ? (<>{format(date.from, "LLL dd")} - {format(date.to, "LLL dd")}</>) : (format(date.from, "LLL dd, y"))) : (<span>اختر فترة</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
                                </PopoverContent>
                            </Popover>
                            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحركات</SelectItem>
                                    <SelectItem value="transaction">دين (معاملات)</SelectItem>
                                    <SelectItem value="payment">تسديد (دفع/قبض)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={confirmationFilter} onValueChange={(v) => setConfirmationFilter(v as any)}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">الكل</SelectItem>
                                    <SelectItem value="confirmed">المؤكدة</SelectItem>
                                    <SelectItem value="unconfirmed">غير المؤكدة</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="border rounded-md overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="p-2 font-bold text-center" style={{ width: header.getSize() }}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                     <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">لا توجد بيانات لهذه الفترة.</TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <LedgerRow key={row.original.id} row={row} index={row.index} exchanges={exchanges} onActionSuccess={handleActionSuccess} />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DataTablePagination table={table} />
                </CardContent>
            </Card>
        </div>
    );
}
