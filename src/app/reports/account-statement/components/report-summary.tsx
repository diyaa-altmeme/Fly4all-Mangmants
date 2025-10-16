
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ReportInfo } from "@/lib/types";
import { Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";


const formatCurrencyDisplay = (amount: number, currency: string) => {
    if (Math.abs(amount) < 0.01) return `0.00 ${currency}`;
    const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${formattedAmount} ${currency}`;
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


export default function ReportSummary({ report }: { report: ReportInfo }) {
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

    