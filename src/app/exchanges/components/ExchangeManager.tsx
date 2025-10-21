"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Exchange, UnifiedLedgerEntry } from "@/lib/types";
import {
  getUnifiedExchangeLedger,
  updateBatch,
  deleteExchangePaymentBatch,
  deleteExchangeTransactionBatch,
} from "../actions";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Icons
import {
  Loader2,
  ChevronDown,
  MoreHorizontal,
  History,
  Copy,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
  PlusCircle,
  Wallet,
} from "lucide-react";

// Motion
import { AnimatePresence, motion } from "framer-motion";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState, getFilteredRowModel, RowSelectionState } from '@tanstack/react-table';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from './add-exchange-dialog';
import EditBatchDialog from "./EditBatchDialog";
import { Label } from "@/components/ui/label";


// ===== Helpers =====
const formatCurrency = (amount?: number, currency = "USD") => {
  if (amount == null) return "-";
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`
  );
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

// ✅ مكون الصف المنسدل
function LedgerRow({ row, onConfirm }: { row: any; onConfirm: (id: string, entryType: string, checked: boolean) => void }) {
  const entry = row.original;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCheck = async (checked: boolean) => {
    setIsPending(true);
    await onConfirm(entry.id, entry.entryType, checked);
    setIsPending(false);
  };

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <TableBody data-state={open ? "open" : "closed"}>
        <TableRow className={entry.isConfirmed ? "bg-green-100" : ""}>
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
                  <AlertDialogAction onClick={() => {
                    setDialogOpen(false);
                    handleCheck(false);
                  }}>تأكيد</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TableCell>

          <TableCell className="text-center font-bold">
            {entry.invoiceNumber}
          </TableCell>
          <TableCell className="text-center">
            {format(parseISO(entry.date), "yyyy-MM-dd")}
          </TableCell>
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
            {entry.entryType === "transaction"
              ? formatCurrency(Math.abs(entry.totalAmount))
              : "-"}
          </TableCell>
          <TableCell className="text-center font-bold text-green-600">
            {entry.entryType === "payment" && entry.totalAmount > 0
              ? formatCurrency(entry.totalAmount)
              : "-"}
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
                        {d.partyName || d.paidTo}: {formatCurrency(d.amountInUSD)}{" "}
                        USD ({d.note})
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
      </TableBody>
    </Collapsible>
  );
}


// ✅ المكون الرئيسي
export default function ExchangeManager({ initialExchanges, initialExchangeId }: { initialExchanges: any[]; initialExchangeId: string; }) {
  const { toast } = useToast();
  const [exchangeId, setExchangeId] = useState(initialExchangeId || "");
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [unifiedLedger, setUnifiedLedger] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [loading, setLoading] = useState(true);

  const fetchExchangeData = useCallback(async () => {
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
    fetchExchangeData();
  }, [fetchExchangeData]);

  // ✅ تأكيد بدون انتقال صفحة
  const handleConfirm = async (id: string, entryType: string, checked: boolean) => {
    try {
      const result = await updateBatch(id, entryType as "transaction" | "payment", { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setUnifiedLedger((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, isConfirmed: checked } : e
        )
      );
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
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
                    <TableCell colSpan={9} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : unifiedLedger.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                unifiedLedger
                    .slice(
                      pagination.pageIndex * pagination.pageSize,
                      (pagination.pageIndex + 1) * pagination.pageSize
                    )
                    .map((row) => (
                      <LedgerRow
                        key={row.id}
                        entry={row}
                        onConfirm={handleConfirm}
                      />
                    ))
                )}
            </Table>
          </div>

          <DataTablePagination
            table={{
              getState: () => ({ pagination }),
              setPageIndex: (i: number) => setPagination((p) => ({ ...p, pageIndex: i })),
              getCanPreviousPage: () => pagination.pageIndex > 0,
              getCanNextPage: () =>
                (pagination.pageIndex + 1) * pagination.pageSize < unifiedLedger.length,
              previousPage: () =>
                setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) })),
              nextPage: () =>
                setPagination((p) => ({
                  ...p,
                  pageIndex: Math.min(
                    Math.ceil(unifiedLedger.length / pagination.pageSize) - 1,
                    p.pageIndex + 1
                  ),
                })),
            } as any}
          />
        </CardContent>
      </Card>
    </div>
  );
}
