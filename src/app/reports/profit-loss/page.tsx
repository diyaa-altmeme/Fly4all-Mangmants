
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function ProfitLossReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0, profit: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/reports/profit-loss");
        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json.entries || []);
        setTotals(json.totals || { revenue: 0, expense: 0, profit: 0 });
      } catch (error) {
        console.error("Error fetching P&L data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تقرير الأرباح والخسائر</CardTitle>
          <CardDescription>عرض ملخص الإيرادات والمصاريف وصافي الربح.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 text-center font-bold text-base">
              <div className="text-green-600">الإيرادات: {totals.revenue.toFixed(2)} $</div>
              <div className="text-red-600">المصاريف: {totals.expense.toFixed(2)} $</div>
              <div className="text-blue-600">الربح الصافي: {totals.profit.toFixed(2)} $</div>
            </div>

            <Separator />

            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">الوصف</th>
                  <th className="text-right p-2">النوع</th>
                  <th className="text-right p-2">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{format(new Date(entry.date), "yyyy-MM-dd")}</td>
                    <td className="p-2">{entry.description}</td>
                    <td className="p-2">{entry.type === "revenue" ? "إيراد" : "مصروف"}</td>
                    <td className={`p-2 font-mono ${entry.type === "revenue" ? "text-green-600" : "text-red-600"}`}>
                      {entry.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
