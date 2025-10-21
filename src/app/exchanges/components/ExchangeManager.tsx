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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ====== Helpers ======
const formatCurrency = (amount?: number, currency = "USD") =>
  amount == null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ` ${currency}`;

const getTypeLabel = (e: UnifiedLedgerEntry) =>
  e.entryType === "transaction"
    ? "دين"
    : (e.totalAmount || 0) > 0
    ? "دفع"
    : "قبض";

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

// ====== Component ======
export default function ExchangeManager({
  initialExchanges,
  initialExchangeId,
}: {
  initialExchanges: Exchange[];
  initialExchangeId: string;
}) {
  const { toast } = useToast();

  const [exchanges] = useState<Exchange[]>(initialExchanges || []);
  const [exchangeId, setExchangeId] = useState(
    initialExchangeId || initialExchanges[0]?.id || ""
  );
  const [ledger, setLedger] = useState<UnifiedLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmFilter, setConfirmFilter] = useState<
    "all" | "confirmed" | "unconfirmed"
  >("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [askUnconfirm, setAskUnconfirm] = useState<{
    open: boolean;
    id?: string;
    type?: "transaction" | "payment";
  }>({ open: false });
  const [auditDialog, setAuditDialog] = useState<{
    open: boolean;
    item?: UnifiedLedgerEntry;
  }>({ open: false });

  const fetchLedger = useCallback(async () => {
    if (!exchangeId) {
      setLedger([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUnifiedExchangeLedger(exchangeId);
      data.sort((a, b) => {
        const da = a.date ? +parseISO(a.date) : 0;
        const db = b.date ? +parseISO(b.date) : 0;
        return db - da;
      });
      setLedger(data);
    } catch (e: any) {
      toast({
        title: "خطأ في التحميل",
        description: e?.message || "تعذر تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [exchangeId, toast]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filtered = useMemo(() => {
    let arr = ledger;
    const q = search.toLowerCase().trim();
    if (q)
      arr = arr.filter(
        (e) =>
          e.invoiceNumber?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.userName?.toLowerCase().includes(q)
      );
    if (confirmFilter !== "all") {
      const want = confirmFilter === "confirmed";
      arr = arr.filter((e) => !!e.isConfirmed === want);
    }
    return arr;
  }, [ledger, search, confirmFilter]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, e) => {
        acc.debit += getDebit(e);
        acc.credit += getCredit(e);
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [filtered]);
  const net = summary.credit - summary.debit;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const start = safePageIndex * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const doToggleConfirm = async (
    id: string,
    type: "transaction" | "payment",
    checked: boolean
  ) => {
    const keepPage = pageIndex;
    try {
      setLedger((prev) =>
        prev.map((x) => (x.id === id ? { ...x, isConfirmed: checked } : x))
      );
      const res = await updateBatch(id, type, { isConfirmed: checked });
      if (!res?.success) throw new Error(res?.error || "فشل التحديث");
      toast({ title: checked ? "تم التأكيد" : "تم إلغاء التأكيد" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setPageIndex(keepPage);
    }
  };

  const Stat = ({
    title,
    value,
    color,
  }: {
    title: string;
    value: number;
    color: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="rounded-xl border p-3 shadow-sm transition-all duration-200 bg-card text-card-foreground"
    >
      <div className="text-xs text-muted-foreground">{title}</div>
      <div
        className={cn(
          "mt-1 font-extrabold text-lg font-mono tabular-nums whitespace-nowrap",
          color
        )}
      >
        {formatCurrency(value)}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>إدارة المعاملات</CardTitle>
              <CardDescription>عرض وتأكيد العمليات المالية</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-[260px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث شامل..."
                  className="pr-9"
                />
              </div>
              <Select
                value={confirmFilter}
                onValueChange={(v: any) => setConfirmFilter(v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="حالة التأكيد" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="confirmed">المؤكدة</SelectItem>
                  <SelectItem value="unconfirmed">غير المؤكدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <Stat title="إجمالي علينا (مدين)" value={summary.debit} color="text-destructive" />
            <Stat title="إجمالي لنا (دائن)" value={summary.credit} color="text-green-500 dark:text-green-400" />
            <Stat title="صافي الرصيد" value={net} color="text-primary" />
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden border rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-center w-[60px]">#</TableHead>
                  <TableHead className="text-center w-[50px]"></TableHead>
                  <TableHead className="text-center">الفاتورة</TableHead>
                  <TableHead className="text-center">التاريخ</TableHead>
                  <TableHead className="text-center">النوع</TableHead>
                  <TableHead className="text-center">الوصف</TableHead>
                  <TableHead className="text-center">علينا</TableHead>
                  <TableHead className="text-center">لنا</TableHead>
                  <TableHead className="text-center">المحصلة</TableHead>
                  <TableHead className="text-center">المستخدم</TableHead>
                  <TableHead className="text-center w-[70px]">تأكيد</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
                      <Loader2 className="animate-spin mx-auto h-6 w-6" />
                    </TableCell>
                  </TableRow>
                ) : pageRows.length ? (
                  pageRows.map((e, i) => {
                    const open = !!expanded[e.id];
                    const debit = getDebit(e);
                    const credit = getCredit(e);
                    return (
                      <React.Fragment key={e.id}>
                        <TableRow
                          className={cn(
                            "transition-colors",
                            e.isConfirmed && "bg-accent/40"
                          )}
                        >
                          <TableCell className="text-center font-semibold">
                            {start + i + 1}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setExpanded((prev) => ({
                                  ...prev,
                                  [e.id]: !prev[e.id],
                                }))
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
                          <TableCell className="text-center font-bold">
                            {e.invoiceNumber || "-"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {e.date ? format(parseISO(e.date), "yyyy-MM-dd") : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                e.entryType === "transaction"
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {getTypeLabel(e)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{e.description || "-"}</TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-destructive">
                            {debit > 0 ? formatCurrency(debit) : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums text-green-500 dark:text-green-400">
                            {credit > 0 ? formatCurrency(credit) : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            {formatCurrency((e.balance as any) ?? credit - debit)}
                          </TableCell>
                          <TableCell className="text-center">{e.userName || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={!!e.isConfirmed}
                              onCheckedChange={(c) =>
                                doToggleConfirm(
                                  e.id,
                                  e.entryType as "transaction" | "payment",
                                  !!c
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>

                        <AnimatePresence>
                          {open && (
                            <TableRow>
                              <TableCell colSpan={11} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden bg-muted/30"
                                >
                                  <div className="p-3 text-sm">
                                    {Array.isArray(e.details) && e.details.length ? (
                                      e.details.map((d: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="grid grid-cols-2 md:grid-cols-6 gap-2 border rounded-md p-2 mb-2 bg-background"
                                        >
                                          <div>الطرف: {d.partyName || "-"}</div>
                                          <div>العملة: {d.originalCurrency}</div>
                                          <div>المبلغ: {d.originalAmount}</div>
                                          <div>سعر الصرف: {d.rate || "-"}</div>
                                          <div>بالدولار: {formatCurrency(d.amountInUSD)}</div>
                                          <div>ملاحظات: {d.note || "-"}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-muted-foreground">لا توجد تفاصيل إضافية</div>
                                    )}
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/40 rounded-b-xl">
            <div className="text-xs text-muted-foreground">
              الصفحة {safePageIndex + 1} من {pageCount} — {filtered.length} سجل
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
                      {s} صف/صفحة
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}
              >
                {"<< الأولى"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                {"< السابقة"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex((p) => Math.min(p + 1, pageCount - 1))}
              >
                {"التالية >"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex(pageCount - 
