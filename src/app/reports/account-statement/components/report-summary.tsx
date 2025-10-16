
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ReportInfo } from "@/lib/types";
import { Banknote, TrendingDown, TrendingUp } from "lucide-react";

const formatCurrencyDisplay = (amount: number, currency: string) => {
    if (Math.abs(amount) < 0.01) return `0.00 ${currency}`;
    const formattedAmount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return `${formattedAmount} ${currency}`;
};

const StatCard = ({ title, usd, iqd, className, icon: Icon }: { title: string; usd: number; iqd: number; className?: string, icon: React.ElementType }) => (
    <div className={`p-4 bg-muted/50 rounded-xl border-l-4 ${className}`}>
        <div className="flex items-center gap-3">
            <Icon className="h-6 w-6" />
            <p className="text-sm font-bold text-muted-foreground">{title}</p>
        </div>
        <div className="mt-2 text-right">
            <p className="font-bold font-mono text-lg">{formatCurrencyDisplay(usd, 'USD')}</p>
            <p className="font-bold font-mono text-base text-muted-foreground">{formatCurrencyDisplay(iqd, 'IQD')}</p>
        </div>
    </div>
);


export default function ReportSummary({ report }: { report: ReportInfo }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="pt-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="الرصيد الافتتاحي" 
                        usd={report.openingBalanceUSD} 
                        iqd={report.openingBalanceIQD} 
                        className="border-gray-500" 
                        icon={Banknote} 
                    />
                    <StatCard 
                        title="إجمالي الدائن" 
                        usd={report.totalCreditUSD} 
                        iqd={report.totalCreditIQD} 
                        className="border-green-500"
                        icon={TrendingUp}
                    />
                    <StatCard 
                        title="إجمالي المدين" 
                        usd={report.totalDebitUSD} 
                        iqd={report.totalDebitIQD} 
                        className="border-red-500"
                        icon={TrendingDown}
                    />
                     <StatCard 
                        title="الرصيد الختامي" 
                        usd={report.finalBalanceUSD} 
                        iqd={report.finalBalanceIQD} 
                        className="border-blue-500"
                        icon={Banknote}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

