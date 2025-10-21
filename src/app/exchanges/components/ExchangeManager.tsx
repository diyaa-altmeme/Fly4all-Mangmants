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
  PlusCircle,
  XCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";

// Motion
import { AnimatePresence, motion } from "framer-motion";

import AddTransactionsDialog from "./add-transactions-dialog";
import AddPaymentsDialog from "./add-payments-dialog";
import AddExchangeDialog from "./add-exchange-dialog";
import EditBatchDialog from "./EditBatchDialog";
import { Label } from "@/components/ui/label";

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
      ? { label: "تسديد", className: "bg-blue-600 text-white" }
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
    toast({ title: "تم نسخ المعلومات" });
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
  const [unifiedLedger, setUnifiedLedger] = useState<UnifiedLedgerEntry[]>([]);
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

  const handleConfirmChange = async (id: string, entryType: string, checked: boolean) => {
    try {
      const result = await updateBatch(id, entryType as "transaction" | "payment", { isConfirmed: checked });
      if (!result.success) throw new Error(result.error);
      setUnifiedLedger((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isConfirmed: checked } : item))
      );
      toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
    } catch (error: any) {
      toast({ title: "خطأ أثناء التحديث", description: error.message, variant: "destructive" });
    }
  };

  const handleActionSuccess = () => {
      fetchExchangeData();
  };

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
            <div className="flex items-center gap-2">
                <AddTransactionsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={handleActionSuccess}>
                    <Button><PlusCircle className="me-2 h-4 w-4" /> معاملة</Button>
                </AddTransactionsDialog>
                <AddPaymentsDialog exchangeId={exchangeId} exchanges={exchanges} onSuccess={handleActionSuccess}>
                    <Button variant="secondary"><PlusCircle className="me-2 h-4 w-4" /> تسديد</Button>
                </AddPaymentsDialog>
                <Button variant="outline" onClick={fetchExchangeData} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحديث'}
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
                  <TableHead>المستخدم</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
                {loading ? (
                  <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                  </TableBody>
                ) : unifiedLedger.length === 0 ? (
                  <TableBody>
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                  </TableBody>
                ) : (
                  unifiedLedger.map((entry) => (
                    <LedgerRow
                      key={entry.id}
                      entry={entry}
                      exchanges={exchanges}
                      onConfirm={handleConfirmChange}
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
