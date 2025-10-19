

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
    const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
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

    const onCheckedChange = (checked: boolean) => {
        if (!checked) {
            setIsConfirmAlertOpen(true);
        } else {
            handleConfirmChange(true);
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
          <tbody className={cn("border-t", isConfirmed && "bg-green-500/10")}>
            <TableRow>
                <TableCell className="p-2 text-center font-mono">{index + 1}</TableCell>
                <TableCell className="p-2 text-center">
                    <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
                         <Checkbox checked={isConfirmed} onCheckedChange={(c) => onCheckedChange(!!c)} />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>سيؤدي هذا إلى إلغاء تأكيد هذه الدفعة وفتحها للتعديل أو الحذف.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleConfirmChange(false)}>نعم، إلغاء التأكيد</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
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
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive" disabled={isConfirmed}>
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
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'transaction' | 'payment'>('all');
  const [confirmationFilter, setConfirmationFilter] = useState<'all' | 'confirmed' | 'unconfirmed'>('all');
  
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
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

    if (typeFilter !== 'all') {
        processed = processed.filter(entry => entry.entryType === typeFilter);
    }

    if (confirmationFilter !== 'all') {
        processed = processed.filter(entry => (confirmationFilter === 'confirmed') ? entry.isConfirmed : !entry.isConfirmed);
    }
    
    return processed;
}, [unifiedLedger, debouncedSearchTerm, typeFilter, confirmationFilter]);

    const { totalDebitsUSD, totalCreditsUSD, netBalanceUSD } = useMemo(() => {
        const totals = filteredLedger.reduce((acc, entry) => {
            const amount = entry.totalAmount || 0;
            if (amount < 0) { // Transactions are negative
                acc.totalDebitsUSD += Math.abs(amount);
            } else { // Payments are positive
                acc.totalCreditsUSD += amount;
            }
            return acc;
        }, { totalDebitsUSD: 0, totalCreditsUSD: 0 });

        return { ...totals, netBalanceUSD: filteredLedger[0]?.balance || 0 };
    }, [filteredLedger]);
  
    const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'desc';
      const currentSort = sorting[0];
      if (currentSort?.id === key && currentSort.desc === false) {
          direction = 'desc';
      } else {
           direction = 'asc';
      }
      setSorting([{id: key, desc: direction === 'desc'}]);
  };
  
    const handleExport = () => {
    if (filteredLedger.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    toast({ title: "وظيفة معطلة", description: "تم تعطيل تصدير Excel مؤقتًا.", variant: "destructive" });
  };
  
    const columns: ColumnDef<UnifiedLedgerEntry>[] = useMemo(() => [
        { id: '#', header: '#', cell: ({ row, table }) => pagination.pageIndex * pagination.pageSize + row.index + 1 },
        { id: 'confirmation', header: () => <div className="text-center">تأكيد</div>, cell: ({ row }) => <Checkbox checked={row.original.isConfirmed} onCheckedChange={(checked) => { /* Logic in LedgerRow */ }} /> },
        { id: 'detailsToggle', cell: ({ row }) => <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:rotate-180"><ChevronDown className="h-4 w-4" /></Button></CollapsibleTrigger> },
        { accessorKey: 'invoiceNumber', header: 'رقم الفاتورة' },
        { accessorKey: 'createdAt', header: 'التاريخ', cell: ({ row }) => format(parseISO(row.original.createdAt), 'yyyy-MM-dd HH:mm') },
        { accessorKey: 'entryType', header: 'النوع', cell: ({ row }) => {
            const entry = row.original;
            if (entry.entryType === 'transaction') return <Badge variant="destructive">دين</Badge>;
            const details = entry.details as ExchangePayment[];
            const hasPayments = details.some(d => d.type === 'payment');
            const hasReceipts = details.some(d => d.type === 'receipt');
            if (hasPayments && !hasReceipts) return <Badge className="bg-blue-500 hover:bg-blue-600">دفع</Badge>;
            if (!hasPayments && hasReceipts) return <Badge className="bg-green-500 hover:bg-green-600">قبض</Badge>;
            return <Badge variant="secondary">تسديد/قبض</Badge>;
        }},
        { accessorKey: 'description', header: 'الوصف', cell: ({ row }) => <div className="text-right whitespace-pre-wrap">{row.original.description}</div> },
        { id: 'debit', header: () => <div className="text-center text-red-600 font-semibold">علينا</div>, cell: ({ row }) => {
            const amount = row.original.totalAmount || 0;
            const onUsAmount = row.original.entryType === 'transaction' ? Math.abs(amount) : (amount < 0 ? Math.abs(amount) : 0);
            return <div className="text-center font-mono">{onUsAmount > 0 ? formatCurrency(onUsAmount, 'USD') : '-'}</div>;
        }},
        { id: 'credit', header: () => <div className="text-center text-green-600 font-semibold">لنا</div>, cell: ({ row }) => {
            const amount = row.original.totalAmount || 0;
            const forUsAmount = row.original.entryType === 'payment' && amount > 0 ? amount : 0;
            return <div className="text-center font-mono">{forUsAmount > 0 ? formatCurrency(forUsAmount, 'USD') : '-'}</div>;
        }},
        { accessorKey: 'balance', header: () => <div className="text-center">المحصلة</div>, cell: ({ row }) => <div className={cn("font-mono font-bold text-center", (row.original.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(row.original.balance, 'USD')}</div> },
        { accessorKey: 'userName', header: 'المستخدم' },
        { id: 'actions', cell: ({ row }) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <EditBatchDialog batch={row.original} exchanges={exchanges} onSuccess={(updatedBatch) => handleActionSuccess('update', updatedBatch)}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={row.original.isConfirmed}>
                    <Edit className="me-2 h-4 w-4" />تعديل
                  </DropdownMenuItem>
                </EditBatchDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive" disabled={row.original.isConfirmed}>
                      <Trash2 className="me-2 h-4 w-4" /> حذف
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيؤدي هذا لحذف الدفعة وجميع الحركات المرتبطة بها.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                          const action = row.original.entryType === 'transaction' ? deleteExchangeTransactionBatch : deleteExchangePaymentBatch;
                          action(row.original.id).then(result => {
                              if (result.success && result.deletedId) {
                                  toast({ title: "تم الحذف بنجاح" });
                                  handleActionSuccess('delete', { id: result.deletedId });
                              } else {
                                  toast({ title: "خطأ", description: result.error, variant: "destructive" });
                              }
                          });
                      }}>نعم، قم بالحذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
        )},
    ], [exchanges, handleActionSuccess, pagination]);
    
    const table = useReactTable({
      data: filteredLedger,
      columns,
      state: { sorting, pagination },
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      manualPagination: false, // We're doing client-side pagination on the fetched data
    });

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
                            </div>
                            <div className="flex-grow"></div>
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
                     <div className="pt-4 grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto] items-end gap-2 border-t mt-4">
                        <div className="relative">
                            <Label htmlFor="main-search">بحث شامل</Label>
                            <Search className="absolute left-3 top-10 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="main-search"
                                placeholder="بحث بالفاتورة، الوصف، المستخدم، الطرف الآخر..."
                                className="ps-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                           <Label>الفترة الزمنية</Label>
                           <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[260px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>{format(date.from, "LLL dd")} - {format(date.to, "LLL dd")}</>
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
                        <div className="flex gap-2 self-end">
                             <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="نوع الحركة" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحركات</SelectItem>
                                    <SelectItem value="transaction">دين (معاملات)</SelectItem>
                                    <SelectItem value="payment">تسديد (دفع/قبض)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={confirmationFilter} onValueChange={(v) => setConfirmationFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">الكل</SelectItem>
                                    <SelectItem value="confirmed">المؤكدة</SelectItem>
                                    <SelectItem value="unconfirmed">غير المؤكدة</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <Button onClick={fetchExchangeData} disabled={loading} className="self-end">
                            {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Filter className="me-2 h-4 w-4" />}
                            تطبيق الفلاتر
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="إجمالي علينا (معاملات)" value={totalDebitsUSD} currency="USD" className="border-red-500/30" arrow="down" />
                <StatCard title="إجمالي لنا (تسديدات)" value={totalCreditsUSD} currency="USD" className="border-green-500/30" arrow="up" />
                <StatCard title="الرصيد النهائي" value={netBalanceUSD} currency="USD" className="border-blue-500/30" />
            </div>

            <Card>
                <CardHeader><CardTitle>سجل البورصة الموحد</CardTitle></CardHeader>
                <CardContent className="pt-0">
                    {loading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                        <>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <TableHead key={header.id} className="text-center font-bold">
                                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                    </TableHeader>
                                    
                                        {table.getRowModel().rows.length === 0 ? (
                                            <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="h-24 text-center">لا توجد بيانات لهذه الفترة.</TableCell>
                                            </TableRow>
                                            </TableBody>
                                        ) : table.getRowModel().rows.map((row, idx) => (
                                            <LedgerRow key={row.original.id} entry={row.original} index={idx} exchanges={exchanges} onActionSuccess={handleActionSuccess} />
                                        ))}
                                    
                                </Table>
                            </div>
                            <DataTablePagination table={table} />
                        </>
                    }
                </CardContent>
            </Card>
        </div>
    );
}

