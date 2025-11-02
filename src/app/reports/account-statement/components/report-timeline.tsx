"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportTransaction } from "@/lib/types";
import { mapVoucherLabel } from "@/lib/accounting/labels";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportTimelineProps {
  transactions: ReportTransaction[];
}

const formatCurrencyDisplay = (amount: number, currency: string) => {
  const options =
    currency === "USD"
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
  return new Intl.NumberFormat("en-US", options).format(amount || 0);
};

export default function ReportTimeline({ transactions }: ReportTimelineProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ReportTransaction[]>();

    transactions.forEach((tx) => {
      const parsedDate = tx.date ? parseISO(tx.date) : new Date();
      const key = format(parsedDate, "yyyy-MM-dd");
      const existing = map.get(key) || [];
      existing.push(tx);
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 7)
      .map(([date, items]) => ({
        date,
        displayDate: format(new Date(date), "yyyy-MM-dd"),
        items: items
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20),
      }));
  }, [transactions]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الخط الزمني لأحدث الحركات</CardTitle>
        <CardDescription>
          عرض موجز لأبرز الحركات خلال الأيام الأخيرة، مع روابط سريعة للمستندات الأصلية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map((group) => (
          <div key={group.date} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {group.displayDate}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((tx) => {
                const label = mapVoucherLabel(tx.sourceType || tx.voucherType || tx.type);
                const timeLabel = tx.date ? format(parseISO(tx.date), "HH:mm") : "--:--";
                const direction = tx.debit && tx.debit > 0 ? "debit" : tx.credit && tx.credit > 0 ? "credit" : "neutral";
                const balanceValue =
                  tx.balancesByCurrency?.[tx.currency] ??
                  tx.balance ??
                  (tx.currency === "USD" ? tx.balanceUSD : tx.balanceIQD);
                return (
                  <div
                    key={tx.id}
                    className="rounded-lg border bg-background p-3 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {label}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeLabel}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          direction === "debit" && "bg-green-600/10 text-green-700",
                          direction === "credit" && "bg-red-600/10 text-red-700"
                        )}
                      >
                        {tx.currency}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold">
                      {typeof tx.description === "string"
                        ? tx.description
                        : tx.description?.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.notes}
                    </div>
                    <div className="text-xs font-mono flex items-center justify-between">
                      <span className="text-red-600">
                        مدين: {formatCurrencyDisplay(tx.debit || 0, tx.currency)}
                      </span>
                      <span className="text-green-600">
                        دائن: {formatCurrencyDisplay(tx.credit || 0, tx.currency)}
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          balanceValue < 0
                            ? "text-red-600"
                            : "text-blue-600"
                        )}
                      >
                        الرصيد: {formatCurrencyDisplay(balanceValue, tx.currency)}
                      </span>
                    </div>
                    {tx.sourceRoute && (
                      <Button asChild variant="link" size="sm" className="px-0 h-auto">
                        <Link href={tx.sourceRoute} className="inline-flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          عرض المستند المرتبط
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
