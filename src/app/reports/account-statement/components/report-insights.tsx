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

interface ReportInsightsProps {
  transactions: ReportTransaction[];
  currencyFilter: Currency | "both";
  currencyMetadata?: Record<string, { name?: string; symbol?: string }>;
}

const numberFormatOptions = (currency: string) => {
  if (currency === "IQD") {
    return { minimumFractionDigits: 0, maximumFractionDigits: 0 } as Intl.NumberFormatOptions;
  }
  return { minimumFractionDigits: 2, maximumFractionDigits: 2 } as Intl.NumberFormatOptions;
};

const formatCurrencyValue = (
  value: number,
  currency: string,
  metadata?: ReportInsightsProps["currencyMetadata"]
) => {
  const formatter = new Intl.NumberFormat("en-US", numberFormatOptions(currency));
  const symbol = metadata?.[currency]?.symbol;
  const label = symbol && symbol !== currency ? symbol : currency;
  return `${formatter.format(value || 0)} ${label}`;
};

const palette = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0ea5e9", "#dc2626"];

export default function ReportInsights({
  transactions,
  currencyFilter,
  currencyMetadata,
}: ReportInsightsProps) {
  const allCurrencyCodes = useMemo(() => {
    const codes = new Set<string>();
    Object.keys(currencyMetadata || {}).forEach((code) => codes.add(code));
    transactions.forEach((tx) => codes.add(tx.currency));
    return Array.from(codes);
  }, [currencyMetadata, transactions]);

  const filteredCurrencyCodes = useMemo(() => {
    if (currencyFilter === "both") return allCurrencyCodes;
    return allCurrencyCodes.filter((code) => code === currencyFilter);
  }, [allCurrencyCodes, currencyFilter]);

  const displayCurrencyCodes = useMemo(() => {
    if (filteredCurrencyCodes.length > 0) {
      return filteredCurrencyCodes;
    }
    if (currencyFilter !== "both") {
      return [currencyFilter];
    }
    return allCurrencyCodes;
  }, [filteredCurrencyCodes, currencyFilter, allCurrencyCodes]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number; balance: number }>();
    transactions.forEach((tx) => {
      const currency = tx.currency || "USD";
      const current = map.get(currency) || { debit: 0, credit: 0, balance: 0 };
      current.debit += tx.debit || 0;
      current.credit += tx.credit || 0;
      const balanceValue = tx.balancesByCurrency?.[currency] ?? tx.balance ?? current.balance;
      current.balance = balanceValue;
      map.set(currency, current);
    });
    return map;
  }, [transactions]);

  const currencyBadges = useMemo(() => {
    return displayCurrencyCodes.map((currency) => {
      const totals = totalsByCurrency.get(currency) || {
        debit: 0,
        credit: 0,
        balance: 0,
      };
      const label = currencyMetadata?.[currency]?.name || currency;
      return {
        currency,
        label,
        totals,
      };
    });
  }, [displayCurrencyCodes, totalsByCurrency, currencyMetadata]);

  const trendCurrencyCodes = useMemo(() => {
    if (currencyFilter === "both") {
      return displayCurrencyCodes.slice(0, 4);
    }
    return displayCurrencyCodes.slice(0, 1);
  }, [displayCurrencyCodes, currencyFilter]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    transactions.forEach((tx) => {
      const parsedDate = tx.date ? parseISO(tx.date) : new Date();
      const key = format(parsedDate, "yyyy-MM-dd");
      const current = map.get(key) || { date: key };
      current[`balance_${tx.currency}`] = tx.balancesByCurrency?.[tx.currency] ?? tx.balance ?? 0;
      map.set(key, current);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
  }, [transactions]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        count: number;
        totals: Record<string, { debit: number; credit: number }>;
      }
    >();

    transactions.forEach((tx) => {
      const id = tx.sourceType || tx.voucherType || tx.type || "other";
      const label = mapVoucherLabel(id);
      const entry = map.get(id) || {
        id,
        label,
        count: 0,
        totals: {},
      };
      const currencyTotals = entry.totals[tx.currency] || { debit: 0, credit: 0 };
      currencyTotals.debit += tx.debit || 0;
      currencyTotals.credit += tx.credit || 0;
      entry.totals[tx.currency] = currencyTotals;
      entry.count += 1;
      map.set(id, entry);
    });

    const relevantCurrencies = currencyFilter === "both" ? displayCurrencyCodes : displayCurrencyCodes.slice(0, 1);

    return Array.from(map.values())
      .map((entry) => {
        const totals: Record<string, number> = {};
        relevantCurrencies.forEach((currency) => {
          const currencyTotals = entry.totals[currency] || { debit: 0, credit: 0 };
          totals[`debit_${currency}`] = currencyTotals.debit;
          totals[`credit_${currency}`] = currencyTotals.credit;
        });
        return { ...entry, ...totals };
      })
      .sort((a, b) => {
        const totalForEntry = (item: typeof a) => {
          return relevantCurrencies.reduce((sum, currency) => {
            return (
              sum +
              (item[`debit_${currency}`] || 0) +
              (item[`credit_${currency}`] || 0)
            );
          }, 0);
        };
        return totalForEntry(b) - totalForEntry(a);
      })
      .slice(0, 8);
  }, [transactions, currencyFilter, displayCurrencyCodes]);

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
          {currencyBadges.map((item) => {
            const totals = item.totals;
            const isOutsideFilter =
              currencyFilter !== "both" && currencyFilter !== item.currency;
            return (
              <div
                key={item.currency}
                className="rounded-lg border p-3 bg-muted/30"
              >
                <p className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  {item.label}
                  {isOutsideFilter && (
                    <Badge variant="outline" className="text-[10px]">
                      خارج التصفية
                    </Badge>
                  )}
                </p>
                <div className="mt-2 text-sm space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي المدين</span>
                    <span>{formatCurrencyValue(totals.debit, item.currency, currencyMetadata)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي الدائن</span>
                    <span>{formatCurrencyValue(totals.credit, item.currency, currencyMetadata)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>الرصيد الختامي</span>
                    <span>{formatCurrencyValue(totals.balance, item.currency, currencyMetadata)}</span>
                  </div>
                </div>
              </div>
            );
          })}
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
                  {trendCurrencyCodes.map((currency, index) => {
                    const color = palette[index % palette.length];
                    return (
                      <Area
                        key={currency}
                        type="monotone"
                        dataKey={`balance_${currency}`}
                        name={`الرصيد (${currency})`}
                        stroke={color}
                        fill={color}
                        strokeWidth={2}
                        fillOpacity={0.2 + (index % 3) * 0.2}
                      />
                    );
                  })}
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
                  {displayCurrencyCodes.map((currency, index) => {
                    const color = palette[index % palette.length];
                    return (
                      <React.Fragment key={currency}>
                        <Bar
                          dataKey={`debit_${currency}`}
                          name={`مدين ${currency}`}
                          stackId={currency}
                          fill={color}
                          fillOpacity={0.85}
                        />
                        <Bar
                          dataKey={`credit_${currency}`}
                          name={`دائن ${currency}`}
                          stackId={currency}
                          fill={color}
                          fillOpacity={0.45}
                        />
                      </React.Fragment>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
