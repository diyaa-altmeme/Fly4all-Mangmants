
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Exchange, UnifiedLedgerEntry } from '@/lib/types';
import { getUnifiedExchangeLedger, getExchanges, deleteExchangeTransactionBatch, deleteExchangePaymentBatch, updateBatch } from '../actions';
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Button,
} from "@/components/ui/button";
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatCurrency = (amount?: number, currency = "USD") => {
  if (amount == null) return "-";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
};

// ✅ مكون الصف المنسدل
function LedgerRow({ entry, onConfirm }: { entry: any; onConfirm: (id: string, entryType: string, checked: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const handleCheck = async (checked: boolean) => {
    setIsPending(true);
    await onConfirm(entry.id, entry.entryType, checked);
    toast({ title: `تم ${checked ? 'تأكيد' : 'إلغاء تأكيد'} الدفعة` });
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
              onCheckedChange={(checked) => handleCheck(Boolean(checked))}
            />
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>كشف العمليات</CardTitle>
          <CardDescription>
            النظام يدعم التأكيد بدون إعادة تحميل الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : unifiedLedger.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      لا توجد بيانات.
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                unifiedLedger.map((entry) => (
                  <LedgerRow
                    key={entry.id}
                    entry={entry}
                    onConfirm={handleConfirm}
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
