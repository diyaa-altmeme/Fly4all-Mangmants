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

// UI
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
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
} from "lucide-react";

// Motion
import { AnimatePresence, motion } from "framer-motion";

// ===== Helpers =====
const formatCurrency = (v?: number, c = "USD") =>
  v === undefined || v === null
    ? "-"
    : `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v)} ${c}`;

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

// ===== Row Component (HTML-safe) =====

function LedgerRow({
  entry,
  exchanges,
  onConfirm,
  onActionSuccess,
}: {
  entry: any;
  exchanges: Exchange[];
  onConfirm: (id: string, type: "transaction" | "payment", checked: boolean) => Promise<void> | void;
  onActionSuccess: () => void;
}) {
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [auditDialog, setAuditDialog] = useState(false);

  const typeBadge =
    entry.entryType === "transaction"
      ? { label: "دين", className: "bg-red-600/90 text-white" }
      : (entry.totalAmount || 0) > 0
      ? { label: "دفع", className: "bg-blue-600 text-white" }
      : { label: "قبض", className: "bg-green-600 text-white" };

  const doConfirm = async (checked: boolean) => {
    setIsPending(true);
    await onConfirm(entry.id, entry.entryType, checked);
    setIsPending(false);
  };
  
  const onDelete = async () => {
    const del =
      entry.entryType === "transaction"
        ? deleteExchangeTransactionBatch
        : deleteExchangePaymentBatch;

    const res = await del(entry.id);
    if (!res?.success) {
      toast({ title: "خطأ", description: res?.error || "تعذر الحذف", variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف" });
    onActionSuccess();
  };

  const copyRow = () => {
    const exName = exchanges.find((x) => x.id === entry.exchangeId)?.name || "-";
    const lines = [
      `البورصة: ${exName}`,
      `الفاتورة: ${entry.invoiceNumber ?? "-"}`,
      `التاريخ: ${entry.date ? format(parseISO(entry.date), "yyyy-MM-dd") : "-"}`,
      `النوع: ${typeBadge.label}`,
      `الوصف: ${entry.description ?? "-"}`,
      `المستخدم: ${entry.userName ?? "-"}`,
    ];
    if (Array.isArray(entry.details) && entry.details.length) {
      lines.push("— التفاصيل —");
      entry.details.forEach((d: any, i: number) =>
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
  

  return (
    <Collapsible asChild open={show} onOpenChange={setShow}>
      <tbody data-state={show ? "open" : "closed"}>
        <TableRow className={cn("align-middle", entry.isConfirmed && "bg-green-100/70")}>
          <TableCell className="text-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShow((s) => !s)}
              aria-label="عرض التفاصيل"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", show && "rotate-180")} />
            </Button>
          </TableCell>

          <TableCell className="text-center">
            <Checkbox
              checked={entry.isConfirmed}
              disabled={isPending}
              onCheckedChange={(checked) => {
                if (entry.isConfirmed && !checked) setConfirmDialog(true);
                else doConfirm(true);
              }}
            />
            <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الإلغاء</AlertDialogTitle>
                  <AlertDialogDescription>هل تريد إلغاء تأكيد هذه الحركة؟</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>رجوع</AlertDialogCancel>
                  <AlertDialogAction onClick={() => doConfirm(false)}>تأكيد</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TableCell>

          <TableCell className="text-center font-semibold">{entry.invoiceNumber}</TableCell>
          <TableCell className="text-center">
            {entry.date ? format(parseISO(entry.date), "yyyy-MM-dd") : "-"}
          </TableCell>
          <TableCell className="text-center">
            <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
          </TableCell>
          <TableCell className="text-center">{entry.description || "-"}</TableCell>
          <TableCell className="text-center">{entry.userName || "-"}</TableCell>

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
                 <DropdownMenuItem onClick={() => setAuditDialog(true)}>
                    <History className="h-4 w-4 ms-1" />
                    سجل التعديلات
                 </DropdownMenuItem>
                <DropdownMenuItem onClick={copyRow}>
                  <Copy className="h-4 w-4 ms-1" />
                  نسخ المعلومات
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4 ms-1" />
                      حذف
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                      <AlertDialogDescription>سيتم حذف هذه الحركة نهائيًا.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>نعم، احذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
             <Dialog open={auditDialog} onOpenChange={setAuditDialog}>
                 <DialogContent>
                      <DialogHeader>
                        <DialogTitle>سجل التعديلات — الفاتورة: {entry.invoiceNumber || "-"}</DialogTitle>
                      </DialogHeader>
                      {/* ... Audit Log Table ... */}
                  </DialogContent>
             </Dialog>
          </TableCell>
        </TableRow>

        {show && (
          <TableRow>
            <TableCell colSpan={8} className="p-0">
               <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
              <div className="bg-muted/50 p-3 text-sm border-t">
                {Array.isArray(entry.details) && entry.details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="px-2 py-1 text-start">الطرف</th>
                          <th className="px-2 py-1 text-start">المبلغ الأصلي</th>
                          <th className="px-2 py-1 text-start">العملة</th>
                          <th className="px-2 py-1 text-start">سعر الصرف</th>
                          <th className="px-2 py-1 text-start">المعادَل بالدولار</th>
                          <th className="px-2 py-1 text-start">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.details.map((d: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">{d.partyName || d.paidTo || "-"}</td>
                            <td className="px-2 py-1">{formatCurrency(d.originalAmount, d.originalCurrency)}</td>
                            <td className="px-2 py-1">{d.originalCurrency || "-"}</td>
                            <td className="px-2 py-1">{d.rate ?? "-"}</td>
                            <td className="px-2 py-1">{formatCurrency(d.amountInUSD, "USD")}</td>
                            <td className="px-2 py-1">{d.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="text-muted-foreground">لا توجد تفاصيل إضافية</span>
                )}
              </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </tbody>
    </Collapsible>
  );
}


/* ================= Main Component ================= */

export default function ExchangeManager({
  initialExchanges,
  initialExchangeId,
}: {
  initialExchanges: Exchange[];
  initialExchangeId: string;
}) {
  const { toast } = useToast();

  const [exchangeId, setExchangeId] = useState(initialExchangeId || "");
  const [exchanges] = useState(initialExchanges);
  const [data, setData] = useState<UnifiedLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "all",
    confirmed: "all",
    user: "all",
    dateRange: defaultRange,
  });

  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");


  const load = useCallback(async () => {
    if (!exchangeId) return;
    setLoading(true);
    try {
      const rows = await getUnifiedExchangeLedger(exchangeId);
      setData(rows || []);
    } catch (e: any) {
      toast({ title: "خطأ في التحميل", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const usersList = useMemo(() => {
    const s = new Set<string>();
    data.forEach((d) => d.userName && s.add(d.userName));
    return Array.from(s);
  }, [data]);

  /* ---------- Filtering ---------- */
  const filtered = useMemo(() => {
    let arr = data;

    // Type filter
    if (filters.type !== "all") {
        if (filters.type === "transaction") arr = arr.filter((e) => e.entryType === "transaction");
        else if (filters.type === "payment") arr = arr.filter((e) => e.entryType === "payment" && (e.totalAmount || 0) > 0);
        else if (filters.type === "receipt") arr = arr.filter((e) => e.entryType === "payment" && (e.totalAmount || 0) < 0);
    }

    // Confirmed filter
    if (filters.confirmed !== "all") {
        const want = filters.confirmed === "confirmed";
        arr = arr.filter((e) => !!e.isConfirmed === want);
    }

    // User filter
    if (filters.user && filters.user !== "all") {
        arr = arr.filter((e) => e.userName === filters.user);
    }

    // Date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
        const fromTs = filters.dateRange.from ? startOfDay(filters.dateRange.from).getTime() : -Infinity;
        const toTs = filters.dateRange.to ? endOfDay(filters.dateRange.to).getTime() : Infinity;
        arr = arr.filter(e => {
            const ts = e.date ? parseISO(e.date).getTime() : e.createdAt ? parseISO(e.createdAt).getTime() : 0;
            return ts >= fromTs && ts <= toTs;
        });
    }

    // Search filter
    if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        arr = arr.filter(e => 
            e.invoiceNumber?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.userName?.toLowerCase().includes(q)
        );
    }

    return arr;
  }, [data, filters]);

  /* ---------- Totals (summary bar) ---------- */
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

  /* ---------- Pagination ---------- */
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  /* ---------- Mutations ---------- */
  const onConfirm = async (id: string, type: "transaction" | "payment", checked: boolean) => {
    try {
      const result = await updateBatch(id, type, { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setData((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, isConfirmed: checked } : e
        )
      );
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const onActionSuccess = () => load();

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إدارة المعاملات</CardTitle>
          <CardDescription>
            فلاتر متقدمة، ملخص مالي، وتفاصيل قابلة للطي.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ===== Summary Bar ===== */}
          <div className="grid gap-3 sm:grid-cols-3 rounded-lg border bg-muted/30 p-3">
             <div className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
              <span className="text-sm text-muted-foreground">علينا (USD)</span>
              <span className="font-bold text-red-600">{formatCurrency(summary.debitUSD, "USD")}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
              <span className="text-sm text-muted-foreground">لنا (USD)</span>
              <span className="font-semibold text-green-600">{formatCurrency(summary.creditUSD, "USD")}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
              <span className="text-sm text-muted-foreground">المحصلة</span>
              <span className={cn("font-semibold", summary.balance >= 0 ? "text-green-700" : "text-red-700")}>
                {formatCurrency(summary.balance, "USD")}
              </span>
            </div>
          </div>
          
          {/* ===== Filters & Actions Row ===== */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="w-full sm:w-[200px] pr-9 h-9"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <Select value={filters.type} onValueChange={(v: any) => setFilters((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الأنواع</SelectItem><SelectItem value="transaction">دين</SelectItem><SelectItem value="payment">دفع</SelectItem><SelectItem value="receipt">قبض</SelectItem></SelectContent>
            </Select>
            <Select value={filters.confirmed} onValueChange={(v: any) => setFilters((f) => ({ ...f, confirmed: v }))}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="yes">مؤكد</SelectItem><SelectItem value="no">غير مؤكد</SelectItem></SelectContent>
            </Select>
            <Select value={filters.user} onValueChange={(v: any) => setFilters((f) => ({ ...f, user: v }))}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل المستخدمين</SelectItem>{usersList.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[240px] justify-start h-9">
                  <CalendarIcon className="h-4 w-4 ml-2" />
                  {filters.dateRange?.from ? format(filters.dateRange.from, "dd/MM/yy") : "من"} - {filters.dateRange?.to ? format(filters.dateRange.to, "dd/MM/yy") : "إلى"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0"><Calendar mode="range" selected={filters.dateRange} onSelect={(r) => setFilters((f) => ({ ...f, dateRange: r }))} numberOfMonths={2} /></PopoverContent>
            </Popover>

            <div className="ms-auto flex items-center gap-2">
              <AddTransactionsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={load}><Button><PlusCircle className="me-2 h-4 w-4" /> معاملة</Button></AddTransactionsDialog>
              <AddPaymentsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={load}><Button variant="secondary"><PlusCircle className="me-2 h-4 w-4" /> تسديد</Button></AddPaymentsDialog>
            </div>
          </div>
          
          {/* ===== Table ===== */}
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[44px] text-center"></TableHead>
                  <TableHead className="w-[84px] text-center">تأكيد</TableHead>
                  <TableHead className="min-w-[120px] text-center">الفاتورة</TableHead>
                  <TableHead className="min-w-[120px] text-center">التاريخ</TableHead>
                  <TableHead className="min-w-[100px] text-center">النوع</TableHead>
                  <TableHead className="min-w-[240px] text-center">الوصف</TableHead>
                  <TableHead className="min-w-[140px] text-center">المستخدم</TableHead>
                  <TableHead className="w-[80px] text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableBody><TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow></TableBody>
              ) : pageSlice.length === 0 ? (
                <TableBody><TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">لا توجد بيانات مطابقة.</TableCell></TableRow></TableBody>
              ) : (
                pageSlice.map((entry) => (
                  <LedgerRow
                    key={entry.id}
                    entry={entry}
                    exchanges={exchanges}
                    onConfirm={onConfirm}
                    onActionSuccess={onActionSuccess}
                  />
                ))
              )}
            </Table>
          </div>

          {/* ===== Pagination ===== */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              الصفحة {page} من {totalPages} — {pageSlice.length} / {filtered.length} سجل
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>الأولى</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>السابق</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>التالي</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>الأخيرة</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```