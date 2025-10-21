
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Exchange, UnifiedLedgerEntry, ExchangeTransaction, ExchangePayment, AuditLog } from '@/lib/types';
import { getUnifiedExchangeLedger, getExchanges, deleteExchangeTransactionBatch, deleteExchangePaymentBatch, updateBatch } from '../actions';
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2, ChevronDown, Calendar as CalendarIcon, Filter, GitCompareArrows, Search, UserPlus, ArrowUpDown, RefreshCw, Download, CheckCheck, Copy, History } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from './add-exchange-dialog';
import { Badge } from "@/components/ui/badge";
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
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EditBatchDialog from "./EditBatchDialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { produce } from 'immer';
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState, getFilteredRowModel, Row, RowSelectionState, PaginationState, type Table as ReactTable } from '@tanstack/react-table';
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRouter } from 'next/navigation';


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

const StatCard = ({ title, usd, iqd, className, arrow }: { title: string; usd: number; iqd: number; className?: string, arrow?: 'up' | 'down' }) => (
    <div className={cn("text-center p-3 rounded-lg border", className)}>
        <p className="text-sm text-muted-foreground font-bold flex items-center justify-center gap-1">
             {arrow === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
             {arrow === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
            {title}
        </p>
        <p className={cn("font-bold font-mono text-xl")}>
            {(usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </p>
        <p className={cn("font-bold font-mono text-lg text-muted-foreground")}>
            {(iqd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} IQD
        </p>
    </div>
);

const LedgerRow = ({ row, exchanges, onActionSuccess, table, setUnifiedLedger }: { 
    row: Row<UnifiedLedgerEntry>, 
    exchanges: Exchange[], 
    onActionSuccess: (action: 'update' | 'delete' | 'add', data: any) => void,
    table: ReactTable<UnifiedLedgerEntry>,
    setUnifiedLedger: React.Dispatch<React.SetStateAction<UnifiedLedgerEntry[]>>
}) => {
    const entry = row.original;
    const { toast } = useToast();
    const [isPending, setIsPending] = React.useState(false);
    const [auditLogOpen, setAuditLogOpen] = useState(false);
    
    const handleConfirmChange = async (checked: boolean) => {
      setIsPending(true);
      const currentPage = table.getState().pagination.pageIndex;
    
      try {
        const result = await updateBatch(
          row.original.id,
          row.original.entryType as 'transaction' | 'payment',
          { isConfirmed: checked }
        );
    
        if (!result.success) throw new Error(result.error);
        
        setUnifiedLedger(currentLedger =>
            currentLedger.map(item =>
                item.id === row.original.id ? { ...item, isConfirmed: checked } : item
            )
        );
    
        toast({ title: `تم ${checked ? "تأكيد" : "إلغاء تأكيد"} الدفعة` });
      } catch (error: any) {
        toast({
          title: 'خطأ',
          description: 'فشل تحديث حالة التأكيد.',
          variant: 'destructive',
        });
        setUnifiedLedger(currentLedger =>
            currentLedger.map(item =>
                item.id === row.original.id ? { ...item, isConfirmed: !checked } : item
            )
        );
      } finally {
        setIsPending(false);
        table.setPageIndex(currentPage);
      }
    };
    
    const [dialogOpen, setDialogOpen] = React.useState(false);
    
    const confirmUncheck = () => {
        setDialogOpen(false);
        handleConfirmChange(false);
    };

    const textToCopy = `${exchanges.find(ex => ex.id === entry.exchangeId)?.name || ''}\nتاريخ العملية: ${entry.date}\nرقم الفاتورة: ${entry.invoiceNumber || 'N/A'}\nالوصف: ${entry.description}`.trim();
    const handleCopy = (e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(textToCopy); toast({ title: "تم نسخ التفاصيل بنجاح" }); };

    return (
        <Collapsible asChild>
            <tbody className={cn("border-t", entry.isConfirmed && "bg-green-500/10")}>
                <TableRow data-state={row.getIsExpanded() ? "open" : "closed"}>
                    <TableCell className="p-1 text-center">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", row.getIsExpanded() && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                    </TableCell>
                    {row.getVisibleCells().map(cell => (
                         <TableCell key={cell.id} className="p-1" style={{ width: cell.column.getSize() }} onClick={cell.column.id === 'entryType' ? handleCopy : undefined}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    ))}
                    <TableCell className="text-center p-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                 <DropdownMenuItem onClick={() => setAuditLogOpen(true)}>
                                    <History className="me-2 h-4 w-4" />
                                    سجل التعديلات
                                </DropdownMenuItem>
                                <EditBatchDialog batch={row.original} exchanges={exchanges} onSuccess={(updatedBatch) => onActionSuccess('update', updatedBatch)}>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="me-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                                </EditBatchDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذه الدفعة وكل المعاملات المرتبطة بها.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={async () => {
                                                const deleteAction = row.original.entryType === 'transaction' ? deleteExchangeTransactionBatch : deleteExchangePaymentBatch;
                                                const result = await deleteAction(row.original.id);
                                                if (result.success && result.deletedId) {
                                                    toast({ title: 'تم حذف الدفعة بنجاح' });
                                                    onActionSuccess('delete', { id: result.deletedId });
                                                } else {
                                                    toast({ title: "خطأ", description: result.error, variant: "destructive" });
                                                }
                                            }}>نعم، احذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <Dialog open={auditLogOpen} onOpenChange={setAuditLogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>سجل التعديلات للفاتورة: {entry.invoiceNumber}</DialogTitle>
                                </DialogHeader>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>التاريخ</TableHead>
                                            <TableHead>الموظف</TableHead>
                                            <TableHead>الإجراء</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(entry.auditLog || []).map((log, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{format(parseISO(log.timestamp), 'yyyy-MM-dd hh:mm a')}</TableCell>
                                                <TableCell>{log.userName}</TableCell>
                                                <TableCell><Badge>{log.action}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={12} className="p-0">
                             <div className="p-2 bg-muted">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead className="p-1">الطرف</TableHead>
                                            <TableHead className="p-1">بواسطة</TableHead>
                                            <TableHead className="p-1">النوع</TableHead>
                                            <TableHead className="p-1">المبلغ الأصلي</TableHead>
                                            <TableHead className="p-1">سعر الصرف</TableHead>
                                            <TableHead className="p-1">المعادل بالدولار</TableHead>
                                            <TableHead className="p-1">ملاحظات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(entry.details as any[]).map((detail, index) => {
                                            const isTransaction = entry.entryType === 'transaction';
                                            const detailType = isTransaction ? 'دين' : (detail.type === 'payment' ? 'دفع' : 'قبض');
                                            const detailTypeClass = isTransaction ? 'bg-red-500' : (detail.type === 'payment' ? 'bg-blue-500' : 'bg-green-500');
                                            
                                            return (
                                                <TableRow key={index} className="text-xs">
                                                    <TableCell className="p-1 font-semibold">{detail.partyName || detail.paidTo}</TableCell>
                                                    <TableCell className="p-1">{detail.intermediary || (isTransaction ? exchanges.find(ex => ex.id === entry.exchangeId)?.name : '-')}</TableCell>
                                                    <TableCell className="p-1 text-center"><Badge className={cn("text-white", detailTypeClass)}>{detailType}</Badge></TableCell>
                                                    <TableCell className="p-1 font-mono text-right whitespace-nowrap">{detail.originalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} {detail.originalCurrency}</TableCell>
                                                    <TableCell className="p-1 font-mono text-right">{detail.originalCurrency !== 'USD' ? detail.rate : '-'}</TableCell>
                                                    <TableCell className="p-1 font-mono font-bold text-right whitespace-nowrap">{formatCurrency(detail.amountInUSD)}</TableCell>
                                                    <TableCell className="p-1">{detail.note}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </tbody>
        </Collapsible>
    )
}

const getColumns = (setUnifiedLedger: React.Dispatch<React.SetStateAction<UnifiedLedgerEntry[]>>): ColumnDef<UnifiedLedgerEntry>[] => [
    { id: 'rowNumber', header: '#', cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return pageIndex * pageSize + row.index + 1;
    }, size: 40 },
    { id: 'isConfirmed', header: 'تأكيد', cell: ({ row }) => {
        const [isPending, setIsPending] = React.useState(false);
        const [dialogOpen, setDialogOpen] = React.useState(false);
        const { toast } = useToast();
        const table = (row as any).table;
        
         const handleConfirmChange = async (checked: boolean) => {
          setIsPending(true);
          const currentPage = table.getState().pagination.pageIndex;
        
          try {
            const result = await updateBatch(
              row.original.id,
              row.original.entryType as 'transaction' | 'payment',
              { isConfirmed: checked }
            );
        
            if (!result.success) throw new Error(result.error);
            
            setUnifiedLedger(currentLedger =>
                currentLedger.map(item =>
                    item.id === row.original.id ? { ...item, isConfirmed: checked } : item
                )
            );
        
            toast({ title: `تم ${checked ? "تأكيد" : "إلغاء تأكيد"} الدفعة` });
          } catch (error: any) {
            toast({
              title: 'خطأ',
              description: 'فشل تحديث حالة التأكيد.',
              variant: 'destructive',
            });
             setUnifiedLedger(currentLedger =>
                currentLedger.map(item =>
                    item.id === row.original.id ? { ...item, isConfirmed: !checked } : item
                )
            );
          } finally {
            setIsPending(false);
            table.setPageIndex(currentPage);
          }
        };
        
        const confirmUncheck = () => {
            setDialogOpen(false);
            handleConfirmChange(false);
        };
        
        return (
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم إلغاء تأكيد هذه الدفعة. هل تريد المتابعة؟</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmUncheck}>نعم، قم بالإلغاء</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
                <Checkbox checked={row.original.isConfirmed} onCheckedChange={(checked) => { if (row.original.isConfirmed && !checked) { setDialogOpen(true); } else { handleConfirmChange(true); } }} disabled={isPending} />
            </AlertDialog>
        );
    }, size: 50 },
    { accessorKey: 'invoiceNumber', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>الفاتورة <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, cell: ({ row }) => <span className="font-bold">{row.original.invoiceNumber}</span>, size: 120 },
    { accessorKey: 'date', header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>التاريخ <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, cell: ({ row }) => <span className="font-bold">{format(parseISO(row.original.date), 'yyyy-MM-dd')}</span>, size: 120 },
    { id: 'entryType', header: 'النوع', size: 100,
      cell: ({ row }) => {
          const entry = row.original;
          if (entry.entryType === 'transaction') {
              return <Badge variant={'destructive'} className="font-bold cursor-pointer">دين</Badge>;
          } else {
              const amount = entry.totalAmount || 0;
              return amount > 0 
                  ? <Badge className="bg-blue-600 font-bold cursor-pointer">تسديد</Badge> 
                  : <Badge className="bg-green-600 font-bold cursor-pointer">قبض</Badge>;
          }
      }
    },
    { accessorKey: 'description', header: 'الوصف', size: 250 },
    { id: 'debit', header: 'علينا (مدين)', cell: ({ row }) => {
        const entry = row.original;
        const amount = entry.totalAmount || 0;
        const debit = entry.entryType === 'transaction' ? Math.abs(amount) : (amount < 0 ? Math.abs(amount) : 0);
        return <div className="font-bold text-red-600 whitespace-nowrap text-center">{debit > 0 ? formatCurrency(debit, 'USD') : '-'}</div>;
    }, size: 120},
    { id: 'credit', header: 'لنا (دائن)', cell: ({ row }) => {
        const entry = row.original;
        const amount = entry.totalAmount || 0;
        const credit = entry.entryType === 'payment' && amount > 0 ? amount : 0;
        return <div className="font-bold text-green-600 whitespace-nowrap text-center">{credit > 0 ? formatCurrency(credit, 'USD') : '-'}</div>;
    }, size: 120},
    { 
        accessorKey: 'balance', 
        header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>المحصلة <ArrowUpDown className="ms-2 h-4 w-4" /></Button>, 
        cell: ({ row }) => {
            const balance = row.original.balance || 0;
            const colorClass = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-foreground';
            return <span className={cn("font-bold text-lg font-mono", colorClass)}>{formatCurrency(balance, 'USD')}</span>
        },
        size: 150
    },
    { accessorKey: 'userName', header: 'المستخدم', size: 120 },
];


export default function ExchangeManager({ initialExchanges, initialExchangeId }: ExchangeManagerProps) {
    const { toast } = useToast();
    const [exchangeId, setExchangeId] = useState<string>(initialExchangeId || initialExchanges[0]?.id || "");
    const [exchanges, setExchanges] = useState<Exchange[]>(initialExchanges);
    const [unifiedLedger, setUnifiedLedger] = useState<UnifiedLedgerEntry[]>([]);
    const [date, setDate] = React.useState<DateRange | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }]);
    const [typeFilter, setTypeFilter] = useState<'all' | 'transaction' | 'payment' | 'receipt'>('all');
    const [confirmationFilter, setConfirmationFilter] = useState<'all' | 'confirmed' | 'unconfirmed'>('all');
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
    
    const router = useRouter();

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
        } else {
            setUnifiedLedger([]);
            setLoading(false);
        }
    }, [exchangeId, toast, date]);
    
    const handleActionSuccess = useCallback((action: 'update' | 'delete' | 'add', data: any) => {
        if (action === 'add' || action === 'delete') {
          fetchExchangeData();
        } else if (action === 'update') {
          setUnifiedLedger(currentLedger =>
            currentLedger.map(item =>
              item.id === data.id ? { ...item, ...data } : item
            )
          );
        }
    }, [fetchExchangeData]);

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
    
    useEffect(() => {
      setExchangeId(initialExchangeId || initialExchanges[0]?.id || "");
    }, [initialExchangeId, initialExchanges]);

    const filteredLedger = useMemo(() => {
        let filteredData = unifiedLedger;
        
        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
             filteredData = filteredData.filter(entry => 
                (entry.invoiceNumber && entry.invoiceNumber.toLowerCase().includes(lowercasedTerm)) ||
                (entry.description && entry.description.toLowerCase().includes(lowercasedTerm)) ||
                (entry.userName && entry.userName.toLowerCase().includes(lowercasedTerm)) ||
                (entry.details && entry.details.some(
                    (detail: any) =>
                        (detail.partyName && detail.partyName.toLowerCase().includes(lowercasedTerm)) ||
                        (detail.paidTo && detail.paidTo.toLowerCase().includes(lowercasedTerm)) ||
                        (detail.note && detail.note.toLowerCase().includes(lowercasedTerm))
                ))
            );
        }

        if (typeFilter !== 'all') {
            if (typeFilter === 'transaction') {
                filteredData = filteredData.filter(p => p.entryType === 'transaction');
            } else if (typeFilter === 'payment') {
                filteredData = filteredData.filter(p => p.entryType === 'payment' && (p.totalAmount || 0) > 0);
            } else if (typeFilter === 'receipt') {
                 filteredData = filteredData.filter(p => p.entryType === 'payment' && (p.totalAmount || 0) < 0);
            }
        }

        if (confirmationFilter !== 'all') {
            filteredData = filteredData.filter(p => (confirmationFilter === 'confirmed') ? p.isConfirmed : !p.isConfirmed);
        }
        
        return filteredData;
    }, [unifiedLedger, debouncedSearchTerm, typeFilter, confirmationFilter]);
    
    const columns = useMemo(() => getColumns(setUnifiedLedger), []);
    
    const table = useReactTable({
      data: filteredLedger,
      columns,
      state: {
        sorting,
        rowSelection,
        pagination,
      },
      onSortingChange: setSorting,
      onRowSelectionChange: setRowSelection,
      onPaginationChange: setPagination,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    });

    useEffect(() => {
        fetchExchangeData();
    }, [fetchExchangeData]);
    
     useEffect(() => {
      if (!loading && table) {
        table.setPageIndex(pagination.pageIndex);
      }
    }, [loading, table, pagination.pageIndex]);

    const summary = useMemo(() => {
        return filteredLedger.reduce((acc, entry) => {
            const amount = entry.totalAmount || 0;
            if (entry.entryType === 'transaction') {
                acc.totalDebitUSD += Math.abs(amount);
            } else if(entry.entryType === 'payment') {
                if (amount > 0) acc.totalCreditUSD += amount;
                else acc.totalDebitUSD += Math.abs(amount);
            }
            return acc;
        }, { totalDebitUSD: 0, totalCreditUSD: 0, totalDebitIQD: 0, totalCreditIQD: 0 });
    }, [filteredLedger]);
    
    const netBalanceUSD = summary.totalCreditUSD - summary.totalDebitUSD;
    const netBalanceIQD = summary.totalCreditIQD - summary.totalDebitIQD;
    
    const handleExport = () => {
        if (filteredLedger.length === 0) {
          toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
          return;
        }
        const dataToExport = filteredLedger.map(entry => ({
          'رقم الفاتورة': entry.invoiceNumber || 'N/A',
          'التاريخ': entry.date,
          'الوقت': format(parseISO(entry.createdAt), 'HH:mm'),
          'النوع': entry.entryType === 'transaction' ? 'دين' : (entry.totalAmount && entry.totalAmount > 0 ? 'تسديد' : 'قبض'),
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

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex w-full flex-col items-start gap-4">
                        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                             <div className="text-right">
                                <CardTitle>إدارة البورصات والمعاملات</CardTitle>
                                <CardDescription>نظام تفاعلي لإدارة المعاملات اليومية للبورصات، وتسجيل الدفعات، ومتابعة الأرصدة.</CardDescription>
                            </div>
                            <div className="w-full sm:w-auto">
                                <Label htmlFor="exchange-select" className="font-bold text-sm">البورصة الحالية:</Label>
                                <Select value={exchangeId} onValueChange={(e) => setExchangeId(e)}>
                                    <SelectTrigger className="w-full h-9 mt-1">
                                        <SelectValue placeholder="اختر بورصة..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exchanges.map((x) => (
                                            <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg bg-muted">
                            <StatCard title="إجمالي مطلوب لنا (دائنون لنا)" usd={summary.totalCreditUSD} iqd={summary.totalCreditIQD} className="border-green-500/30 bg-background text-green-600" />
                            <StatCard title="إجمالي مطلوب منا (مدينون لنا)" usd={summary.totalDebitUSD} iqd={summary.totalDebitIQD} className="border-red-500/30 bg-background text-red-600" />
                            <StatCard title="صافي الرصيد الإجمالي" usd={netBalanceUSD} iqd={netBalanceIQD} className={cn("border-blue-500/30 bg-background", netBalanceUSD > 0 ? "text-green-600" : netBalanceUSD < 0 ? "text-red-600" : "text-foreground")} />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
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
                                    <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل الحركات</SelectItem>
                                        <SelectItem value="transaction">دين (معاملات)</SelectItem>
                                        <SelectItem value="payment">تسديد (دفع)</SelectItem>
                                        <SelectItem value="receipt">قبض</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={confirmationFilter} onValueChange={(v) => setConfirmationFilter(v as any)}>
                                    <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">الكل</SelectItem>
                                        <SelectItem value="confirmed">المؤكدة</SelectItem>
                                        <SelectItem value="unconfirmed">غير المؤكدة</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={refreshAllData} variant="outline" size="icon" className="h-9 w-9" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4" />}
                            </Button>
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
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        <TableHead className="p-1 w-[50px]"></TableHead>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="p-2 font-bold whitespace-nowrap" style={{ width: header.getSize() }}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                    <TableHead className="p-1 text-center w-[120px]">خيارات</TableHead>
                                    </TableRow>
                                ))}
                            </TableHeader>
                            
                                {loading ? (
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={columns.length + 2} className="h-24 text-center">لا توجد بيانات لهذه الفترة.</TableCell>
                                        </TableRow>
                                    </TableBody>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <LedgerRow 
                                            key={row.original.id} 
                                            row={row} 
                                            exchanges={exchanges} 
                                            onActionSuccess={handleActionSuccess}
                                            table={table}
                                            setUnifiedLedger={setUnifiedLedger}
                                        />
                                    ))
                                )}
                            
                        </Table>
                    </div>
                    <DataTablePagination table={table} />
                </CardContent>
            </Card>
        </div>
    );
}
