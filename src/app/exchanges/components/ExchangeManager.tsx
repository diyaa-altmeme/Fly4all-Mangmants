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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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

function LedgerRow({ entry, onConfirm, exchanges, onActionSuccess }: { entry: any; onConfirm: (id: string, entryType: string, checked: boolean) => void; exchanges: Exchange[], onActionSuccess: () => void; }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCheck = async (checked: boolean) => {
    setIsPending(true);
    await onConfirm(entry.id, entry.entryType, checked);
    setIsPending(false);
  };
  
  const getTypeLabel = (e: UnifiedLedgerEntry) =>
    e.entryType === "transaction" ? "دين" : (e.totalAmount || 0) > 0 ? "دفع" : "قبض";

  const getDebit = (e: UnifiedLedgerEntry) => {
    const a = e.totalAmount || 0;
    if (e.entryType === "transaction") return Math.abs(a);
    if (e.entryType === "payment" && a < 0) return Math.abs(a);
    return 0;
  };
  const getCredit = (e: UnifiedLedgerEntry) => {
    const a = e.totalAmount || 0;
    if (e.entryType === "payment" && a > 0) return a;
    return 0;
  };

  const copyAll = (e: UnifiedLedgerEntry) => {
    const exName = exchanges.find((x) => x.id === e.exchangeId)?.name || "-";
    const lines = [
      `البورصة: ${exName}`,
      `الفاتورة: ${e.invoiceNumber || "-"}`,
      `التاريخ: ${e.date ? format(parseISO(e.date), "yyyy-MM-dd") : "-"}`,
      `النوع: ${getTypeLabel(e)}`,
      `الوصف: ${e.description || "-"}`,
      `علينا: ${formatCurrency(getDebit(e))}`,
      `لنا: ${formatCurrency(getCredit(e))}`,
      `المحصلة: ${formatCurrency((e.balance as any) ?? getCredit(e) - getDebit(e))}`,
      `المستخدم: ${e.userName || "-"}`,
    ];
    if (Array.isArray(e.details) && e.details.length) {
      lines.push("— التفاصيل —");
      e.details.forEach((d: any, i) =>
        lines.push(
          `${i + 1}) ${d.partyName || d.paidTo || "-"} | ${d.originalAmount} ${
            d.originalCurrency
          } @ ${d.rate ?? "-"} = ${d.amountInUSD} USD | ${d.note || "-"}`
        )
      );
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "تم نسخ التفاصيل" });
  };
  
  const onDelete = async () => {
    try {
      const del =
        entry.entryType === "transaction"
          ? deleteExchangeTransactionBatch
          : deleteExchangePaymentBatch;
      const res = await del(entry.id);
      if (!res?.success) throw new Error(res?.error || "فشل الحذف");
      onActionSuccess();
      toast({ title: "تم الحذف بنجاح" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "تعذر الحذف",
        variant: "destructive",
      });
    }
  };

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <>
        <TableRow data-state={open ? "open" : "closed"} className={cn(entry.isConfirmed && "bg-green-100")}>
          <TableCell className="text-center">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
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
                  handleCheck(true);
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
                  <AlertDialogAction onClick={() => handleCheck(false)}>تأكيد</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TableCell>
          <TableCell className="text-center font-bold">{entry.invoiceNumber}</TableCell>
          <TableCell className="text-center">{format(parseISO(entry.date), "yyyy-MM-dd")}</TableCell>
          <TableCell className="text-center">
            {entry.entryType === "transaction" ? (
              <Badge variant="destructive">دين</Badge>
            ) : (entry.totalAmount || 0) > 0 ? (
              <Badge className="bg-blue-600">تسديد</Badge>
            ) : (
              <Badge className="bg-green-600 text-white">قبض</Badge>
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
          <TableCell className="text-center">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <EditBatchDialog batch={entry} exchanges={exchanges} onSuccess={onActionSuccess}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Edit className="h-4 w-4 ms-1" />
                      تعديل
                    </DropdownMenuItem>
                  </EditBatchDialog>
                  <DropdownMenuItem onClick={() => copyAll(entry)}>
                    <Copy className="h-4 w-4 ms-1" />
                    نسخ المعلومات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={e => e.preventDefault()}
                        >
                            <Trash2 className="h-4 w-4 ms-1" />
                            حذف
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم حذف هذه الدفعة بشكل نهائي.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={onDelete}>نعم، قم بالحذف</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={10}>
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
                  <span className="text-muted-foreground">
                    لا توجد تفاصيل إضافية
                  </span>
                )}
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
}

export default function ExchangeManager({ initialExchanges, initialExchangeId }: { initialExchanges: any[], initialExchangeId: string }) {
  const { toast } = useToast();
  const [exchangeId, setExchangeId] = useState(initialExchangeId || "");
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [unifiedLedger, setUnifiedLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!exchangeId) return;
    setLoading(true);
    try {
      const data = await getUnifiedExchangeLedger(exchangeId);
      setUnifiedLedger(data);
    } catch (err: any) {
      toast({ title: "خطأ في تحميل البيانات", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmChange = async (id: string, entryType: string, checked: boolean) => {
    try {
      const result = await updateBatch(id, entryType as "transaction" | "payment", { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setUnifiedLedger((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isConfirmed: checked } : e))
      );
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleActionSuccess = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>إدارة المعاملات</CardTitle>
          <CardDescription>
            تأكيد المعاملات بدون فقدان الصفحة مع عرض التفاصيل
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-3">
             <div className="flex gap-2">
                <AddTransactionsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={handleActionSuccess}>
                    <Button>
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة معاملة
                    </Button>
                </AddTransactionsDialog>
                 <AddPaymentsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={handleActionSuccess}>
                    <Button variant="secondary">
                        <PlusCircle className="me-2 h-4 w-4" />
                        إضافة تسديد
                    </Button>
                </AddPaymentsDialog>
            </div>
            <div className="flex gap-2">
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
               <AddExchangeDialog onSuccess={fetchData}>
                   <Button variant="outline" size="icon"><PlusCircle className="h-4 w-4"/></Button>
              </AddExchangeDialog>
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث"}
              </Button>
            </div>
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
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : unifiedLedger.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                unifiedLedger.map((entry) => (
                  <LedgerRow 
                    key={entry.id} 
                    entry={entry} 
                    onConfirm={handleConfirmChange} 
                    exchanges={exchanges}
                    onActionSuccess={handleActionSuccess}
                  />
                ))
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```