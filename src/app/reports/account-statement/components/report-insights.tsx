"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mapVoucherLabel } from "@/lib/accounting/labels";
import type { ReportTransaction, Currency } from "@/lib/types";
import { format, parseISO } from "date-fns";

const formatCurrencyValue = (value: number, currency: Currency) => {
  const options =
    currency === "USD"
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  const formatter = new Intl.NumberFormat("en-US", options);
  return formatter.format(value || 0);
};

interface ReportInsightsProps {
  transactions: ReportTransaction[];
  currencyFilter: Currency | "both";
}

export default function ReportInsights({
  transactions,
  currencyFilter,
}: ReportInsightsProps) {
  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.currency === "USD") {
          acc.usd.debit += tx.debit || 0;
          acc.usd.credit += tx.credit || 0;
          acc.usd.balance = tx.balanceUSD;
        }
        if (tx.currency === "IQD") {
          acc.iqd.debit += tx.debit || 0;
          acc.iqd.credit += tx.credit || 0;
          acc.iqd.balance = tx.balanceIQD;
        }
        return acc;
      },
      {
        usd: { debit: 0, credit: 0, balance: 0 },
        iqd: { debit: 0, credit: 0, balance: 0 },
      }
    );
  }, [transactions]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, {
      date: string;
      debitUSD: number;
      creditUSD: number;
      balanceUSD: number;
      debitIQD: number;
      creditIQD: number;
      balanceIQD: number;
    }>();

    transactions.forEach((tx) => {
      const parsedDate = tx.date ? parseISO(tx.date) : new Date();
      const key = format(parsedDate, "yyyy-MM-dd");
      const current = map.get(key) || {
        date: key,
        debitUSD: 0,
        creditUSD: 0,
        balanceUSD: 0,
        debitIQD: 0,
        creditIQD: 0,
        balanceIQD: 0,
      };

      if (tx.currency === "USD") {
        current.debitUSD += tx.debit || 0;
        current.creditUSD += tx.credit || 0;
        current.balanceUSD = tx.balanceUSD;
      }
      if (tx.currency === "IQD") {
        current.debitIQD += tx.debit || 0;
        current.creditIQD += tx.credit || 0;
        current.balanceIQD = tx.balanceIQD;
      }

      map.set(key, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [transactions]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        debitUSD: number;
        creditUSD: number;
        debitIQD: number;
        creditIQD: number;
        count: number;
      }
    >();

    transactions.forEach((tx) => {
      const id = tx.sourceType || tx.voucherType || tx.type || "other";
      const label = mapVoucherLabel(id);
      const current =
        map.get(id) || {
          id,
          label,
          debitUSD: 0,
          creditUSD: 0,
          debitIQD: 0,
          creditIQD: 0,
          count: 0,
        };

      if (tx.currency === "USD") {
        current.debitUSD += tx.debit || 0;
        current.creditUSD += tx.credit || 0;
      }
      if (tx.currency === "IQD") {
        current.debitIQD += tx.debit || 0;
        current.creditIQD += tx.credit || 0;
      }
      current.count += 1;
      map.set(id, current);
    });

    return Array.from(map.values())
      .sort((a, b) => {
        const aTotal = a.debitUSD + a.creditUSD + a.debitIQD + a.creditIQD;
        const bTotal = b.debitUSD + b.creditUSD + b.debitIQD + b.creditIQD;
        return bTotal - aTotal;
      })
      .slice(0, 8);
  }, [transactions]);

  const currencyBadges: { label: string; debit: number; credit: number; balance: number; currency: Currency }[] = useMemo(
    () => [
      {
        label: "الدولار الأمريكي",
        debit: totals.usd.debit,
        credit: totals.usd.credit,
        balance: totals.usd.balance,
        currency: "USD",
      },
      {
        label: "الدينار العراقي",
        debit: totals.iqd.debit,
        credit: totals.iqd.credit,
        balance: totals.iqd.balance,
        currency: "IQD",
      },
    ],
    [totals]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليلات الحركات المالية</CardTitle>
        <CardDescription>
          نظرة شاملة على توزيع الحركات واتجاه الرصيد بحسب نوع العملية والعملة المختارة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {currencyBadges.map((item) => (
            <div
              key={item.currency}
              className="rounded-lg border p-3 bg-muted/30"
            >
              <p className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                {item.label}
                {currencyFilter !== "both" && currencyFilter !== item.currency && (
                  <Badge variant="outline" className="text-[10px]">
                    خارج التصفية
                  </Badge>
                )}
              </p>
              <div className="mt-2 text-sm space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي المدين</span>
                  <span>{formatCurrencyValue(item.debit, item.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي الدائن</span>
                  <span>{formatCurrencyValue(item.credit, item.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>الرصيد الختامي</span>
                  <span>{formatCurrencyValue(item.balance, item.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              اتجاه الرصيد اليومي
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), "MM-dd")} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="balanceUSD"
                    name="الرصيد (USD)"
                    stroke="#2563eb"
                    fill="#93c5fd"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="balanceIQD"
                    name="الرصيد (IQD)"
                    stroke="#16a34a"
                    fill="#bbf7d0"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              أهم العمليات حسب إجمالي الحركة
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="debitUSD" name="مدين USD" stackId="usd" fill="#16a34a" />
                  <Bar dataKey="creditUSD" name="دائن USD" stackId="usd" fill="#dc2626" />
                  <Bar dataKey="debitIQD" name="مدين IQD" stackId="iqd" fill="#0ea5e9" />
                  <Bar dataKey="creditIQD" name="دائن IQD" stackId="iqd" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
