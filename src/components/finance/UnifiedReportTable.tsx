
"use client";
import React, { useMemo } from "react";
import { format } from "date-fns";
import type { ReportInfo, ReportTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";

const formatCurrency = (amount: number, currency: string) => {
    const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    if (amount < 0) {
        return `(${formattedAmount}) ${currency}`;
    }
    return `${formattedAmount} ${currency}`;
};

export default function UnifiedReportTable({
  report,
  shareR = 50,
  shareM = 50,
}: {
  report: ReportInfo | null;
  shareR?: number;
  shareM?: number;
}) {

  if (!report) {
    return <div className="p-8 text-center text-muted-foreground">الرجاء اختيار حساب وتحديد فترة لعرض التقرير.</div>;
  }
  
  const { transactions } = report;

  const { totalCredit, totalDebit, net, rShare, mShare } = useMemo(() => {
    const totalCredit = transactions.reduce((s, r) => s + r.credit, 0);
    const totalDebit = transactions.reduce((s, r) => s + r.debit, 0);
    const net = totalCredit - totalDebit;
    const rShare = net * (shareR / 100);
    const mShare = net * (shareM / 100);
    return { totalCredit, totalDebit, net, rShare, mShare };
  }, [transactions, shareR, shareM]);

  const mapCategory = (c: string) => ({
    segment: "سكمنت",
    subscription: "اشتراك",
    profit: "أرباح",
    share: "توزيع حصص",
    other: "أخرى"
  } as any)[c] ?? c;

  return (
    <div className="space-y-4">
      <ReportSummary report={report} />
      <div className="overflow-auto rounded border max-h-[60vh]">
        <Table>
          <thead className="bg-muted sticky top-0">
            <tr className="text-right font-bold">
              <th className="p-2">التاريخ</th>
              <th className="p-2">النوع</th>
              <th className="p-2">البيان</th>
              <th className="p-2">مدين</th>
              <th className="p-2">دائن</th>
              <th className="p-2">الرصيد</th>
              <th className="p-2">العملة</th>
              <th className="p-2">الموظف</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td className="p-3 text-center" colSpan={10}>لا توجد بيانات ضمن النطاق المحدد.</td></tr>
            ) : transactions.map((r) => (
              <tr key={r.id} className={cn(
                  "font-bold",
                  r.credit > 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20",
              )}>
                <td className="p-2 whitespace-nowrap">{format(new Date(r.date), "yyyy-MM-dd")}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2 text-xs font-normal">{typeof r.description === 'string' ? r.description : r.description.title}</td>
                <td className="p-2 font-mono text-red-600">{r.debit > 0 ? formatCurrency(r.debit, r.currency || 'IQD') : "-"}</td>
                <td className="p-2 font-mono text-green-600">{r.credit > 0 ? formatCurrency(r.credit, r.currency || 'IQD') : "-"}</td>
                <td className="p-2 font-mono">{formatCurrency(r.balance, r.currency || 'IQD')}</td>
                <td className="p-2">{r.currency}</td>
                <td className="p-2">{r.officer || ''}</td>
                <td className="p-2">
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50 font-bold sticky bottom-0">
             <tr>
                <td className="p-2" colSpan={3}>إجمالي الحركات</td>
                <td className="p-2 font-mono text-red-600">{formatCurrency(report.totalDebitUSD, 'USD')} | {formatCurrency(report.totalDebitIQD, 'IQD')}</td>
                <td className="p-2 font-mono text-green-600">{formatCurrency(report.totalCreditUSD, 'USD')} | {formatCurrency(report.totalCreditIQD, 'IQD')}</td>
                <td className="p-2" colSpan={4}></td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </div>
  );
}
