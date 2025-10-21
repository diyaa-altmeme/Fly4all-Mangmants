
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { Exchange, UnifiedLedgerEntry } from '@/lib/types';
import { getUnifiedExchangeLedger, getExchanges, deleteExchangeTransactionBatch, deleteExchangePaymentBatch, updateBatch } from '../actions';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2, ChevronDown, Calendar as CalendarIcon, Filter, Search, ArrowUpDown, RefreshCw, Download, Copy, History } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState, getFilteredRowModel, RowSelectionState } from '@tanstack/react-table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from './add-exchange-dialog';
import EditBatchDialog from "./EditBatchDialog";

const formatCurrency = (amount?: number, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ` ${currency}`;
};

const LedgerRow = ({ row, onConfirmChange }: { row: any; onConfirmChange: (id: string, entryType: string, checked: boolean) => Promise<void>; }) => {
  const entry = row.original;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConfirm = async (checked: boolean) => {
    setIsPending(true);
    try {
      await onConfirmChange(entry.id, entry.entryType, checked);
      toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
    } catch {
      toast({ title: 'خطأ أثناء التحديث', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <>
        <TableRow data-state={open ? "open" : "closed"} className={cn(entry.isConfirmed && "bg-green-100")}>
          <TableCell className="p-1 text-center">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </TableCell>

          <TableCell className="text-center">
            <Checkbox
              checked={entry.isConfirmed}
              disabled={isPending}
              onCheckedChange={(checked) => {
                if (entry.isConfirmed && !checked) {
                  setDialogOpen(true);
                } else {
                  handleConfirm(true);
                }
              }}
            />
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
                  <AlertDialogDescription>هل تريد إلغاء تأكيد هذه الدفعة؟</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>رجوع</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleConfirm(false)}>تأكيد</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TableCell>

          <TableCell className="font-bold text-center">{entry.invoiceNumber}</TableCell>
          <TableCell className="text-center">{format(parseISO(entry.date), "yyyy-MM-dd")}</TableCell>
          <TableCell className="text-center">
            {entry.entryType === "transaction" ? (
              <Badge variant="destructive">دين</Badge>
            ) : (entry.totalAmount || 0) > 0 ? (
              <Badge className="bg-blue-500 text-white">تسديد</Badge>
            ) : (
              <Badge className="bg-green-500 text-white">قبض</Badge>
            )}
          </TableCell>
          <TableCell className="text-center">{entry.description}</TableCell>
          <TableCell className="text-center font-bold text-red-600">
            {entry.entryType === "transaction" ? formatCurrency(Math.abs(entry.totalAmount)) : "-"}
          </TableCell>
          <TableCell className="text-center font-bold text-green-600">
            {entry.entryType === "payment" && entry.totalAmount > 0 ? formatCurrency(entry.totalAmount) : "-"}
          </TableCell>
          <TableCell className="text-center">{entry.userName}</TableCell>
        </TableRow>

        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={9}>
              <div className="bg-muted p-3 text-sm">
                {entry.details?.length ? (
                  <ul className="space-y-1">
                    {entry.details.map((d: any, i: number) => (
                      <li key={i}>
                        {d.partyName || d.paidTo}: {formatCurrency(d.amountInUSD)} USD ({d.note})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">لا توجد تفاصيل إضافية</span>
                )}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
};


export default function ExchangeManager({ initialExchanges, initialExchangeId }: { initialExchanges: Exchange[]; initialExchangeId: string; }) {
  const { toast } = useToast();
  const [exchangeId, setExchangeId] = useState(initialExchangeId || initialExchanges[0]?.id || "");
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [unifiedLedger, setUnifiedLedger] = useState<UnifiedLedgerEntry[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [loading, setLoading] = useState(true);

  const fetchExchangeData = useCallback(async () => {
    if (!exchangeId) return;
    setLoading(true);
    try {
      const ledgerData = await getUnifiedExchangeLedger(exchangeId);
      setUnifiedLedger(ledgerData);
    } catch (err: any) {
      toast({ title: "خطأ في تحميل البيانات", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast]);

  useEffect(() => {
    fetchExchangeData();
  }, [fetchExchangeData]);

  // ✅ No refetch, no page jumps
  const handleConfirmChange = async (id: string, entryType: string, checked: boolean) => {
    try {
      const result = await updateBatch(id, entryType as "transaction" | "payment", { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setUnifiedLedger((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isConfirmed: checked } : item))
      );
    } catch (error: any) {
      toast({ title: "خطأ أثناء التحديث", description: error.message, variant: "destructive" });
    }
  };

  const table = useReactTable({
    data: unifiedLedger,
    columns: [],
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>إدارة المعاملات</CardTitle>
          <CardDescription>تأكيد المعاملات بدون فقدان الصفحة مع عرض التفاصيل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-3">
            <Select value={exchangeId} onValueChange={setExchangeId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="اختر بورصة..." />
              </SelectTrigger>
              <SelectContent>
                {exchanges.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchExchangeData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث"}
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>تأكيد</TableHead>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>علينا</TableHead>
                  <TableHead>لنا</TableHead>
                  <TableHead>المستخدم</TableHead>
                </TableRow>
              </TableHeader>
              
               {loading ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        لا توجد بيانات.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                    table.getRowModel().rows.map(row => (
                        <LedgerRow key={row.id} row={row} onConfirmChange={handleConfirmChange} />
                    ))
                )}
            </Table>
          </div>

          <DataTablePagination
            table={table}
          />
        </CardContent>
      </Card>
    </div>
  );
}

const handleActionSuccess = (action: 'update' | 'delete' | 'add', updatedData: any) => {
    // This is now handled by the main component's state updates
};
