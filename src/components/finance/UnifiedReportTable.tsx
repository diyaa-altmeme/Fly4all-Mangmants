"use client";
import React, { useMemo } from "react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/transactions";

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
              <th className="p-2">التصنيف</th>
              <th className="p-2">مدين</th>
              <th className="p-2">دائن</th>
              <th className="p-2">الرصيد</th>
              <th className="p-2">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {computed.withBal.length === 0 ? (
              <tr><td className="p-3" colSpan={7}>لا توجد بيانات ضمن النطاق</td></tr>
            ) : computed.withBal.map((r) => (
              <tr key={r.id} className={r.kind === "credit" ? "bg-green-50" : "bg-red-50"}>
                <td className="p-2 whitespace-nowrap">{format(r.date, "yyyy-MM-dd")}</td>
                <td className="p-2">{r.company}</td>
                <td className="p-2">{mapCategory(r.category)}</td>
                <td className="p-2">{r.kind === "debit" ? r.amount.toLocaleString() : "-"}</td>
                <td className="p-2">{r.kind === "credit" ? r.amount.toLocaleString() : "-"}</td>
                <td className="p-2">{(r as any).balance?.toLocaleString()}</td>
                <td className="p-2">{r.notes || ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/50">
            <tr className="font-semibold">
              <td className="p-2" colSpan={3}>الإجمالي</td>
              <td className="p-2">{computed.totalDebit.toLocaleString()}</td>
              <td className="p-2">{computed.totalCredit.toLocaleString()}</td>
              <td className="p-2">{computed.net.toLocaleString()}</td>
              <td className="p-2"></td>
            </tr>
            <tr>
              <td className="p-2" colSpan={3}>توزيع الصافي</td>
              <td className="p-2" colSpan={2}>الروضتين: {computed.rShare.toLocaleString()}</td>
              <td className="p-2">متين: {computed.mShare.toLocaleString()}</td>
              <td className="p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
