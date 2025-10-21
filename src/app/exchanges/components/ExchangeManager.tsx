"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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

// UI
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
} from "lucide-react";

// Motion
import { AnimatePresence, motion } from "framer-motion";

// Dialogs
import AddTransactionDialog from "@/app/exchanges/components/add-transactions-dialog";
import AddPaymentDialog from "@/app/exchanges/components/add-payments-dialog";
import EditBatchDialog from "@/app/exchanges/components/EditBatchDialog";

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

type TypeFilter = "all" | "transaction" | "payment" | "receipt";
type ConfirmFilter = "all" | "confirmed" | "unconfirmed";

export default function ExchangeManager({
  initialExchanges,
  initialExchangeId,
}: {
  initialExchanges: Exchange[];
  initialExchangeId: string;
}) {
  const { toast } = useToast();

  // Data
  const [exchanges] = useState<Exchange[]>(initialExchanges || []);
  const [exchangeId, setExchangeId] = useState(
    initialExchangeId || initialExchanges[0]?.id || ""
  );
  const [ledger, setLedger] = useState<UnifiedLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [confirmFilter, setConfirmFilter] = useState<ConfirmFilter>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(15);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");

  // Expanded rows
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Dialog state (confirm uncheck)
  const [askUnconfirm, setAskUnconfirm] = useState<{
    open: boolean;
    id?: string;
    type?: "transaction" | "payment";
  }>({ open: false });

  // Audit dialog
  const [auditDialog, setAuditDialog] = useState<{ open: boolean; item?: UnifiedLedgerEntry }>(
    { open: false }
  );

  // Fetch
  const fetchLedger = useCallback(async () => {
    if (!exchangeId) {
      setLedger([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUnifiedExchangeLedger(
        exchangeId,
        dateRange.from,
        dateRange.to
      );
      data.sort((a, b) => {
        const da = a.date ? +parseISO(a.date) : a.createdAt ? +parseISO(a.createdAt) : 0;
        const db = b.date ? +parseISO(b.date) : b.createdAt ? +parseISO(b.createdAt) : 0;
        return db - da;
      });
      setLedger(data);
    } catch (e: any) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: e?.message || "تعذر تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Filtered
  const filtered = useMemo(() => {
    let arr = ledger;

    if (typeFilter !== "all") {
      if (typeFilter === "transaction") {
        arr = arr.filter((e) => e.entryType === "transaction");
      } else if (typeFilter === "payment") {
        arr = arr.filter((e) => e.entryType === "payment" && (e.totalAmount || 0) > 0);
      } else if (typeFilter === "receipt") {
        arr = arr.filter((e) => e.entryType === "payment" && (e.totalAmount || 0) < 0);
      }
    }

    if (confirmFilter !== "all") {
      const want = confirmFilter === "confirmed";
      arr = arr.filter((e) => !!e.isConfirmed === want);
    }

    if (userFilter.trim()) {
      const uq = userFilter.toLowerCase();
      arr = arr.filter((e) => (e.userName || "").toLowerCase().includes(uq));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e) => {
        const inDetails =
          Array.isArray(e.details) &&
          e.details.some(
            (d: any) =>
              d.partyName?.toLowerCase().includes(q) ||
              d.paidTo?.toLowerCase().includes(q) ||
              d.note?.toLowerCase().includes(q)
          );
        return (
          e.invoiceNumber?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.userName?.toLowerCase().includes(q) ||
          inDetails
        );
      });
    }

    if (dateRange.from || dateRange.to) {
      const fromTs = dateRange.from ? +new Date(dateRange.from.setHours(0, 0, 0, 0)) : -Infinity;
      const toTs = dateRange.to ? +new Date(dateRange.to.setHours(23, 59, 59, 999)) : Infinity;
      arr = arr.filter((e) => {
        const ts = e.date ? +parseISO(e.date) : e.createdAt ? +parseISO(e.createdAt) : 0;
        return ts >= fromTs && ts <= toTs;
      });
    }

    return arr;
  }, [ledger, search, confirmFilter, typeFilter, userFilter, dateRange]);

  // Summary
  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, e) => {
        acc.debitUSD += getDebit(e);
        acc.creditUSD += getCredit(e);
        return acc;
      },
      { debitUSD: 0, creditUSD: 0 }
    );
  }, [filtered]);
  const netUSD = summary.creditUSD - summary.debitUSD;

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPageIndex((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  const start = pageIndex * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  // Confirm toggle (keep page)
  const doToggleConfirm = async (
    id: string,
    type: "transaction" | "payment",
    checked: boolean
  ) => {
    const keepPage = pageIndex;
    try {
      setLedger((prev) => prev.map((x) => (x.id === id ? { ...x, isConfirmed: checked } : x)));
      const res = await updateBatch(id, type, { isConfirmed: checked });
      if (!res?.success) throw new Error(res?.error || "فشل التحديث");
      toast({ title: checked ? "تم التأكيد" : "تم إلغاء التأكيد" });
    } catch (e: any) {
      setLedger((prev) => prev.map((x) => (x.id === id ? { ...x, isConfirmed: !checked } : x)));
      toast({
        title: "خطأ",
        description: e?.message || "فشل تحديث حالة التأكيد",
        variant: "destructive",
      });
    } finally {
      setPageIndex(keepPage); // ارجاع نفس الصفحة
    }
  };

  const onClickConfirm = (e: UnifiedLedgerEntry, next: boolean) => {
    if (e.isConfirmed && !next) {
      setAskUnconfirm({ open: true, id: e.id, type: e.entryType as any });
    } else {
      doToggleConfirm(e.id, e.entryType as "transaction" | "payment", true);
    }
  };

  // Copy
  const copyType = (e: UnifiedLedgerEntry) => {
    const exName = exchanges.find((x) => x.id === exchangeId)?.name || "-";
    const txt =
      `البورصة: ${exName}\n` +
      `النوع: ${getTypeLabel(e)}\n` +
      `التاريخ: ${e.date ? format(parseISO(e.date), "yyyy-MM-dd") : "-"}\n` +
      `الفاتورة: ${e.invoiceNumber || "-"}\n` +
      `الوصف: ${e.description || "-"}`;
    navigator.clipboard.writeText(txt);
    toast({ title: "تم نسخ المعلومات" });
  };

  const copyAll = (e: UnifiedLedgerEntry) => {
    const exName = exchanges.find((x) => x.id === exchangeId)?.name || "-";
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

  // Delete
  const onDelete = async (e: UnifiedLedgerEntry) => {
    try {
      const del =
        e.entryType === "transaction"
          ? deleteExchangeTransactionBatch
          : deleteExchangePaymentBatch;
      const res = await del(e.id);
      if (!res?.success) throw new Error(res?.error || "فشل الحذف");
      setLedger((prev) => prev.filter((x) => x.id !== e.id));
      toast({ title: "تم الحذف بنجاح" });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err?.message || "تعذر الحذف",
        variant: "destructive",
      });
    }
  };

  // Export
  const onExport = () => {
    if (!filtered.length) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const exName = exchanges.find((x) => x.id === exchangeId)?.name || "";
    const rows = filtered.map((e, idx) => ({
      "#": idx + 1,
      "البورصة": exName,
      "الرقم": e.invoiceNumber || "-",
      "التاريخ": e.date ? format(parseISO(e.date), "yyyy-MM-dd") : "-",
      "النوع": getTypeLabel(e),
      "الوصف": e.description || "-",
      "علينا": getDebit(e),
      "لنا": getCredit(e),
      "المحصلة": (e.balance as any) ?? getCredit(e) - getDebit(e),
      "المستخدم": e.userName || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف");
    XLSX.writeFile(wb, `Statement-${exName || exchangeId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "تم التصدير" });
  };

  // Motion variants (لتحريك تغيير الصفحة والصف المنسدل)
  const slideVariants = {
    hiddenLeft: { x: -24, opacity: 0 },
    hiddenRight: { x: 24, opacity: 0 },
    visible: { x: 0, opacity: 1 },
  };

  const Stat = ({ title, value, hint, tone = "neutral" }: { title: string; value: number; hint?: string; tone?: "neutral" | "good" | "bad" }) => {
    const toneClasses =
      tone === "good"
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        : tone === "bad"
        ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
        : "bg-card text-card-foreground";
    return (
      <div className={cn("rounded-xl border p-3 text-center", toneClasses)}>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="mt-1 font-bold text-lg font-mono tabular-nums whitespace-nowrap">
          {formatCurrency(value)}
        </div>
        {hint ? <div className="text-[11px] text-muted-foreground mt-1">{hint}</div> : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER + SUMMARY */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <CardTitle>إدارة المعاملات</CardTitle>
              <CardDescription>تأكيد المعاملات، عرض التفاصيل، بدون الرجوع للصفحة الأولى</CardDescription>
            </div>

            {/* شريط علوي: أزرار الإضافة + الفلاتر + اختيار البورصة */}
            <div className="flex w-full md:w-auto flex-wrap items-center gap-2">
              {/* اختصارات الإضافة */}
              <AddTransactionDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={fetchLedger}>
                <Button className="h-9">
                  <PlusCircle className="h-4 w-4 ms-1" />
                  معاملة
                </Button>
              </AddTransactionDialog>
              <AddPaymentDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={fetchLedger}>
                <Button variant="secondary" className="h-9">
                  <PlusCircle className="h-4 w-4 ms-1" />
                  تسديد
                </Button>
              </AddPaymentDialog>

              {/* البحث */}
              <div className="relative w-full md:w-[220px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="بحث شامل..."
                  className="pr-9 h-9"
                />
              </div>

              {/* نوع الحركة */}
              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="transaction">دين</SelectItem>
                  <SelectItem value="payment">دفع</SelectItem>
                  <SelectItem value="receipt">قبض</SelectItem>
                </SelectContent>
              </Select>

              {/* حالة التأكيد */}
              <Select value={confirmFilter} onValueChange={(v: any) => setConfirmFilter(v)}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="حالة التأكيد" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="confirmed">المؤكدة</SelectItem>
                  <SelectItem value="unconfirmed">غير المؤكدة</SelectItem>
                </SelectContent>
              </Select>

              {/* المستخدم */}
              <Input
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPageIndex(0);
                }}
                placeholder="المستخدم"
                className="h-9 w-[140px]"
              />

              {/* التاريخ */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 w-[170px] justify-start">
                    <CalendarIcon className="h-4 w-4 ml-2" />
                    {dateRange.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}`
                        : format(dateRange.from, "LLL dd, y")
                      : "نطاق التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(r: any) => {
                      setDateRange({ from: r?.from, to: r?.to });
                      setPageIndex(0);
                    }}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* اختيار البورصة */}
              <Select
                value={exchangeId}
                onValueChange={(v) => {
                  setExchangeId(v);
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="اختر بورصة..." />
                </SelectTrigger>
                <SelectContent align="end">
                  {exchanges.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={fetchLedger} disabled={loading} className="h-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={onExport} className="h-9">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ملخص أعلى الصفحة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <Stat title="إجمالي علينا (مدين)" value={summary.debitUSD} tone="bad" />
            <Stat title="إجمالي لنا (دائن)" value={summary.creditUSD} tone="good" />
            <Stat
              title="صافي الرصيد"
              value={netUSD}
              tone={netUSD >= 0 ? "good" : "bad"}
              hint={netUSD > 0 ? "لنا أكثر" : netUSD < 0 ? "علينا أكثر" : "متوازن"}
            />
          </div>
        </CardHeader>
      </Card>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[56px] p-2">#</TableHead>
                  <TableHead className="text-center w-[84px] p-2">تأكيد</TableHead>
                  <TableHead className="text-center w-[56px] p-2"></TableHead>
                  <TableHead className="text-center p-2">الفاتورة</TableHead>
                  <TableHead className="text-center p-2">التاريخ</TableHead>
                  <TableHead className="text-center p-2">النوع</TableHead>
                  <TableHead className="text-center p-2">الوصف</TableHead>
                  <TableHead className="text-center p-2">علينا</TableHead>
                  <TableHead className="text-center p-2">لنا</TableHead>
                  <TableHead className="text-center p-2">المحصلة</TableHead>
                  <TableHead className="text-center p-2">المستخدم</TableHead>
                  <TableHead className="text-center w-[64px] p-2">إجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-border">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <TableRow key="loading">
                      <TableCell colSpan={12} className="py-10 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : pageRows.length === 0 ? (
                    <TableRow key="empty">
                      <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                        لا توجد بيانات.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <motion.tr
                      key={`${pageIndex}-${pageSize}-${exchangeId}-${typeFilter}-${confirmFilter}-${userFilter}`}
                      variants={slideVariants}
                      initial={slideDir === "right" ? "hiddenRight" : "hiddenLeft"}
                      animate="visible"
                      exit={slideDir === "left" ? "hiddenLeft" : "hiddenRight"}
                      transition={{ duration: 0.22 }}
                    >
                      <TableCell colSpan={12} className="p-0">
                        <Table className="border-t">
                          <TableBody className="divide-y divide-border">
                            {pageRows.map((e, i) => {
                              const open = !!expanded[e.id];
                              const rowNumber = start + i + 1;
                              const debit = getDebit(e);
                              const credit = getCredit(e);

                              return (
                                <React.Fragment key={e.id}>
                                  <TableRow className={cn(e.isConfirmed && "bg-accent/40")}>
                                    {/* رقم */}
                                    <TableCell className="text-center font-semibold p-2">{rowNumber}</TableCell>

                                    {/* تأكيد */}
                                    <TableCell className="text-center p-2">
                                      <Checkbox
                                        checked={!!e.isConfirmed}
                                        onCheckedChange={(c) => onClickConfirm(e, !!c)}
                                      />
                                    </TableCell>

                                    {/* سهم التفاصيل */}
                                    <TableCell className="text-center p-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          setExpanded((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                                        }
                                      >
                                        <ChevronDown
                                          className={cn(
                                            "h-4 w-4 transition-transform",
                                            open && "rotate-180"
                                          )}
                                        />
                                      </Button>
                                    </TableCell>

                                    {/* باقي الأعمدة */}
                                    <TableCell className="text-center font-bold p-2">
                                      {e.invoiceNumber || "-"}
                                    </TableCell>
                                    <TableCell className="text-center whitespace-nowrap p-2">
                                      {e.date ? format(parseISO(e.date), "yyyy-MM-dd") : "-"}
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                      <Badge
                                        className="cursor-pointer select-none"
                                        variant={e.entryType === "transaction" ? "destructive" : "secondary"}
                                        onClick={() => copyType(e)}
                                      >
                                        {getTypeLabel(e)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center p-2">{e.description || "-"}</TableCell>
                                    <TableCell className="text-center font-bold text-destructive whitespace-nowrap font-mono tabular-nums p-2">
                                      {debit > 0 ? formatCurrency(debit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-bold whitespace-nowrap font-mono tabular-nums p-2">
                                      {credit > 0 ? formatCurrency(credit) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center font-bold whitespace-nowrap font-mono tabular-nums p-2">
                                      {formatCurrency((e.balance as any) ?? credit - debit)}
                                    </TableCell>
                                    <TableCell className="text-center whitespace-nowrap p-2">
                                      {e.userName || "-"}
                                    </TableCell>

                                    {/* إجراءات */}
                                    <TableCell className="text-center p-2">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => setAuditDialog({ open: true, item: e })}>
                                            <History className="h-4 w-4 ms-1" />
                                            سجل التعديلات
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => copyAll(e)}>
                                            <Copy className="h-4 w-4 ms-1" />
                                            نسخ المعلومات
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          {/* ✅ منع إغلاق القائمة قبل فتح الـ Dialog لمنع الوميض */}
                                          <EditBatchDialog batch={e} exchanges={exchanges} onSuccess={fetchLedger}>
                                            <DropdownMenuItem onSelect={(ev) => ev.preventDefault()}>
                                              <Edit className="h-4 w-4 ms-1" />
                                              تعديل
                                            </DropdownMenuItem>
                                          </EditBatchDialog>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => onDelete(e)}
                                          >
                                            <Trash2 className="h-4 w-4 ms-1" />
                                            حذف
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>

                                  {/* تفاصيل الصف */}
                                  <AnimatePresence>
                                    {open && (
                                      <TableRow>
                                        <TableCell colSpan={12} className="p-0">
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="bg-muted/50 p-3">
                                              {Array.isArray(e.details) && e.details.length > 0 ? (
                                                <div className="grid gap-2">
                                                  {e.details.map((d: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-md border p-2 bg-background text-sm"
                                                    >
                                                      <div className="font-semibold">
                                                        الطرف:{" "}
                                                        <span className="font-normal">
                                                          {d.partyName || d.paidTo || "-"}
                                                        </span>
                                                      </div>
                                                      <div className="font-semibold">
                                                        بواسطة:{" "}
                                                        <span className="font-normal">
                                                          {d.intermediary || e.userName || "-"}
                                                        </span>
                                                      </div>
                                                      <div className="font-semibold">
                                                        النوع:{" "}
                                                        <span className="font-normal">
                                                          {e.entryType === "transaction"
                                                            ? "دين"
                                                            : d.type === "payment"
                                                            ? "دفع"
                                                            : "قبض"}
                                                        </span>
                                                      </div>
                                                      <div className="font-semibold whitespace-nowrap">
                                                        المبلغ الأصلي:{" "}
                                                        <span className="font-normal whitespace-nowrap">
                                                          {d.originalAmount?.toLocaleString()} {d.originalCurrency}
                                                        </span>
                                                      </div>
                                                      <div className="font-semibold whitespace-nowrap">
                                                        سعر الصرف:{" "}
                                                        <span className="font-normal whitespace-nowrap">
                                                          {d.originalCurrency !== "USD" ? d.rate : "-"}
                                                        </span>
                                                      </div>
                                                      <div className="font-semibold whitespace-nowrap">
                                                        المعادل بالدولار:{" "}
                                                        <span className="font-bold whitespace-nowrap font-mono tabular-nums">
                                                          {formatCurrency(d.amountInUSD)}
                                                        </span>
                                                      </div>
                                                      {d.note ? (
                                                        <div className="md:col-span-6">
                                                          <span className="font-semibold">ملاحظات: </span>
                                                          <span>{d.note}</span>
                                                        </div>
                                                      ) : null}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-muted-foreground">لا توجد تفاصيل إضافية</div>
                                              )}
                                            </div>
                                          </motion.div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </AnimatePresence>
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              الصفحة {pageIndex + 1} من {pageCount} — {filtered.length} سجل
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(parseInt(v, 10));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {[5, 15, 30, 50, 100].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} / صفحة
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex === 0}
                onClick={() => {
                  setSlideDir("left");
                  setPageIndex(0);
                }}
                title="الأولى"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex === 0}
                onClick={() => {
                  setSlideDir("left");
                  setPageIndex((p) => Math.max(0, p - 1));
                }}
                title="السابق"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => {
                  setSlideDir("right");
                  setPageIndex((p) => Math.min(pageCount - 1, p + 1));
                }}
                title="التالي"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => {
                  setSlideDir("right");
                  setPageIndex(pageCount - 1);
                }}
                title="الأخيرة"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تنبيه إلغاء التأكيد */}
      <AlertDialog
        open={askUnconfirm.open}
        onOpenChange={(o) => setAskUnconfirm((s) => ({ ...s, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إلغاء تأكيد هذه العملية المالية؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (askUnconfirm.id && askUnconfirm.type) {
                  doToggleConfirm(askUnconfirm.id, askUnconfirm.type, false);
                }
                setAskUnconfirm({ open: false });
              }}
            >
              نعم، إلغاء التأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* سجل التعديلات المحسن */}
      <Dialog open={auditDialog.open} onOpenChange={(o) => setAuditDialog((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>سجل التعديلات — الفاتورة: {auditDialog.item?.invoiceNumber || "-"}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">التاريخ</TableHead>
                  <TableHead className="text-center">الموظف</TableHead>
                  <TableHead className="text-center">نوع التعديل</TableHead>
                  <TableHead className="text-center">القديم</TableHead>
                  <TableHead className="text-center">الجديد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray((auditDialog.item as any)?.auditLog) &&
                (auditDialog.item as any).auditLog.length ? (
                  (auditDialog.item as any).auditLog.map((log: any, idx: number) => {
                    const type = log.action?.includes("delete")
                      ? "حذف"
                      : log.action?.includes("update")
                      ? "تعديل"
                      : log.action?.includes("create")
                      ? "إضافة"
                      : "غير معروف";
                    const color =
                      type === "حذف"
                        ? "bg-rose-100 text-rose-800"
                        : type === "تعديل"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800";
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-center">
                          {log.timestamp ? format(parseISO(log.timestamp), "yyyy-MM-dd HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-center">{log.userName || "-"}</TableCell>
                        <TableCell className={`text-center font-semibold ${color}`}>{type}</TableCell>
                        <TableCell className="text-xs whitespace-pre-wrap text-muted-foreground">
                          {log.oldData ? JSON.stringify(log.oldData, null, 2) : "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-pre-wrap">
                          {log.newData ? JSON.stringify(log.newData, null, 2) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      لا يوجد سجل تعديلات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
