"use client";
import React, { useMemo } from "react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: currency }).format(amount);
    } catch(e) {
        return `${amount.toLocaleString()} ${currency}`;
    }
};

export default function UnifiedReportTable({
  rows,
  shareR = 50,
  shareM = 50,
}: {
  rows: Transaction[];
  shareR?: number;
  shareM?: number;
}) {
  const computed = useMemo(() => {
    let running = 0;
    const withBal = rows.map((r) => {
      running += r.kind === "credit" ? r.amount : -r.amount;
      return { ...r, balance: running };
    });
    const totalCredit = rows.filter(r => r.kind === "credit").reduce((s, r) => s + r.amount, 0);
    const totalDebit  = rows.filter(r => r.kind === "debit").reduce((s, r) => s + r.amount, 0);
    const net = totalCredit - totalDebit;
    const rShare = net * (shareR / 100);
    const mShare = net * (shareM / 100);
    return { withBal, totalCredit, totalDebit, net, rShare, mShare };
  }, [rows, shareR, shareM]);

  const mapCategory = (c: string) => ({
    segment: "سكمنت",
    subscription: "اشتراك",
    profit: "أرباح",
    share: "توزيع حصص",
    other: "أخرى"
  } as any)[c] ?? c;

  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-right">
              <th className="p-2">التاريخ</th>
              <th className="p-2">الشركة</th>
              <th className="p-2">الحساب</th>
              <th className="p-2">التصنيف</th>
              <th className="p-2">مدين</th>
              <th className="p-2">دائن</th>
              <th className="p-2">الرصيد</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">ملاحظات</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {computed.withBal.length === 0 ? (
              <tr><td className="p-3 text-center" colSpan={10}>لا توجد بيانات ضمن النطاق المحدد.</td></tr>
            ) : computed.withBal.map((r) => (
              <tr key={r.id} className={cn(
                  r.kind === "credit" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20",
                  r.category === "segment" && "border-l-4 border-blue-400",
                  r.category === "subscription" && "border-l-4 border-yellow-400",
                  r.category === "profit" && "border-l-4 border-purple-400"
              )}>
                <td className="p-2 whitespace-nowrap">{format(r.date, "yyyy-MM-dd")}</td>
                <td className="p-2 font-semibold">{r.company}</td>
                <td className="p-2">{r.accountName || '-'}</td>
                <td className="p-2">{mapCategory(r.category)}</td>
                <td className="p-2 font-mono text-red-600">{r.kind === "debit" ? formatCurrency(r.amount, r.currency || 'IQD') : "-"}</td>
                <td className="p-2 font-mono text-green-600">{r.kind === "credit" ? formatCurrency(r.amount, r.currency || 'IQD') : "-"}</td>
                <td className="p-2 font-mono">{formatCurrency((r as any).balance, r.currency || 'IQD')}</td>
                <td className="p-2">{r.status || 'مكتملة'}</td>
                <td className="p-2">{r.notes || ""}</td>
                <td className="p-2">
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50 font-bold">
            <tr>
              <td className="p-2" colSpan={4}>الإجمالي</td>
              <td className="p-2 font-mono text-red-600">{formatCurrency(computed.totalDebit, 'IQD')}</td>
              <td className="p-2 font-mono text-green-600">{formatCurrency(computed.totalCredit, 'IQD')}</td>
              <td className="p-2 font-mono">{formatCurrency(computed.net, 'IQD')}</td>
              <td className="p-2" colSpan={3}></td>
            </tr>
            <tr>
              <td className="p-2" colSpan={4}>توزيع الصافي</td>
              <td className="p-2 font-mono" colSpan={2}>الروضتين: {formatCurrency(computed.rShare, 'IQD')}</td>
              <td className="p-2 font-mono" colSpan={2}>متين: {formatCurrency(computed.mShare, 'IQD')}</td>
              <td className="p-2" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
