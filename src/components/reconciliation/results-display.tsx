

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, HelpCircle, Sigma } from "lucide-react";
import ResultsTable from './results-table';
import type { ReconciliationResult, ReconciledRecord, MatchingField } from '@/lib/reconciliation';
import type { Currency } from '@/lib/types';


const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: { title: string; value: number | string; icon: React.ElementType, colorClass: string, subValue?: string }) => (
  <Card className="text-center">
    <CardHeader className="p-4 pb-2">
      <div className={`mx-auto flex items-center justify-center size-10 bg-opacity-10 rounded-full ${colorClass}`}>
          <Icon className="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground font-bold">{title}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </CardContent>
  </Card>
);

interface ResultsDisplayProps {
    results: ReconciliationResult;
    settingsFields: MatchingField[];
    currency: Currency;
}

export default function ResultsDisplay({ results, settingsFields, currency }: ResultsDisplayProps) {
  const { summary, records } = results;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  }

  return (
    <div className="space-y-6 pt-4 border-t">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="متطابقة" value={summary.matched} icon={CheckCircle} colorClass="text-green-500 bg-green-500" />
        <StatCard title="شبه متطابقة" value={summary.partialMatch} icon={AlertCircle} colorClass="text-yellow-500 bg-yellow-500" subValue={formatCurrency(summary.totalPriceDifference)} />
        <StatCard title="مفقودة لدى المورد" value={summary.missingInSupplier} icon={XCircle} colorClass="text-red-500 bg-red-500" />
        <StatCard title="مفقودة في نظامك" value={summary.missingInCompany} icon={HelpCircle} colorClass="text-blue-500 bg-blue-500" />
        <StatCard title="الإجمالي" value={summary.totalRecords} icon={Sigma} colorClass="text-gray-500 bg-gray-500" />
      </div>

      <ResultsTable data={records} settingsFields={settingsFields} />
    </div>
  );
}
