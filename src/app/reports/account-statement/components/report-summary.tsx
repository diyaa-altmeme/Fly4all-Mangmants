"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportInfo } from "@/lib/types";
import { Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrencyDisplay = (amount: number, currency: string, symbol?: string) => {
    const value = Number(amount) || 0;
    const options = currency === 'IQD'
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const formattedAmount = new Intl.NumberFormat('en-US', options).format(value);
    const displaySymbol = symbol && symbol !== currency ? symbol : currency;
    return `${formattedAmount} ${displaySymbol}`;
};

const StatCard = ({ title, usd, iqd, className, icon: Icon }: { title: string; usd: number; iqd: number; className?: string, icon: React.ElementType }) => (
    <div className={cn("text-center p-2 rounded-lg bg-background", className)}>
        <p className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1">
            <Icon className="h-4 w-4" />
            {title}
        </p>
        <p className={cn("font-bold font-mono text-sm", usd < 0 ? "text-red-500" : "")}> 
            {formatCurrencyDisplay(usd, 'USD')}
        </p>
        <p className={cn("font-bold font-mono text-xs text-muted-foreground", iqd < 0 ? "text-red-500/80" : "")}> 
            {formatCurrencyDisplay(iqd, 'IQD')}
        </p>
    </div>
);

const currencyPriority: Record<string, number> = {
    IQD: 0,
    USD: 1,
    IRR: 2,
};

const currencyIcons: Record<string, string> = {
    IQD: "🇮🇶",
    USD: "💵",
    IRR: "﷼",
};

export default function ReportSummary({ report }: { report: ReportInfo }) {
    if (report.currencyBreakdown && report.currencyBreakdown.length > 0) {
        const orderedBreakdown = [...report.currencyBreakdown].sort((a, b) => {
            const priorityA = currencyPriority[a.currency] ?? 99;
            const priorityB = currencyPriority[b.currency] ?? 99;
            if (priorityA === priorityB) {
                return a.currency.localeCompare(b.currency);
            }
            return priorityA - priorityB;
        });

        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {orderedBreakdown.map((item) => (
                    <Card key={item.currency} className="h-full border-none bg-muted/40 shadow-none">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <span className="text-lg leading-none">{currencyIcons[item.currency] || "💱"}</span>
                                {item.label}
                            </CardTitle>
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5">{item.currency}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xl font-bold font-mono text-primary">
                                {formatCurrencyDisplay(item.finalBalance, item.currency, item.symbol)}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
export default function ReportSummary({ report }: { report: ReportInfo }) {
    if (report.currencyBreakdown && report.currencyBreakdown.length > 0) {
        return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.currencyBreakdown.map((item) => (
                    <Card key={item.currency} className="border border-muted/60 shadow-sm">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold text-foreground">{item.label}</CardTitle>
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5">{item.currency}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-lg font-bold font-mono text-primary">
                                {formatCurrencyDisplay(item.finalBalance, item.currency, item.symbol)}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <span>الرصيد الافتتاحي</span>
                                <span className="text-right font-medium text-foreground">{formatCurrencyDisplay(item.openingBalance, item.currency, item.symbol)}</span>
                                <span>إجمالي المدين</span>
                                <span className="text-right text-red-600 font-semibold">{formatCurrencyDisplay(item.totalDebit, item.currency, item.symbol)}</span>
                                <span>إجمالي الدائن</span>
                                <span className="text-right text-green-600 font-semibold">{formatCurrencyDisplay(item.totalCredit, item.currency, item.symbol)}</span>
                                <span>الرصيد الختامي</span>
                                <span className="text-right font-semibold text-primary">{formatCurrencyDisplay(item.finalBalance, item.currency, item.symbol)}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-4 gap-3 w-full">
            <StatCard
                title="الرصيد الافتتاحي"
                usd={report.openingBalanceUSD}
                iqd={report.openingBalanceIQD}
                className="border-gray-500/30"
                icon={Banknote}
            />
            <StatCard
                title="إجمالي الدائن"
                usd={report.totalCreditUSD}
                iqd={report.totalCreditIQD}
                className="border-green-500/30 text-green-600"
                icon={TrendingUp}
            />
            <StatCard
                title="إجمالي المدين"
                usd={report.totalDebitUSD}
                iqd={report.totalDebitIQD}
                className="border-red-500/30 text-red-600"
                icon={TrendingDown}
            />
             <StatCard
                title="الرصيد الختامي"
                usd={report.finalBalanceUSD}
                iqd={report.finalBalanceIQD}
                className="border-blue-500/30 text-blue-600"
                icon={Wallet}
            />
        </div>
    );
}
