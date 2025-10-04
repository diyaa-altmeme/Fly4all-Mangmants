
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { MonthlyProfit, ProfitShare } from "../actions";
import { getProfitSharesForMonth, seedMonthlyProfit } from "../actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Download, BarChart, Loader2, Edit, Bot, User, Filter, SlidersHorizontal } from "lucide-react";
import SharesTable from "./shares-table";
import AddEditShareDialog from "./add-edit-share-dialog";
import Link from "next/link";
import AddManualProfitDialog from "./add-manual-profit-dialog";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

interface ProfitSharingContentProps {
  initialMonthlyProfits: MonthlyProfit[];
  initialShares: ProfitShare[];
  partners: { id: string; name: string; type: string }[];
  initialMonthId: string;
}

const StatCard = ({ title, value }: { title: string; value: string }) => (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-4 rounded-lg text-center">
        <p className="text-sm text-green-700 dark:text-green-300 font-bold">{title}</p>
        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{value}</p>
    </div>
);

export default function ProfitSharingContent({ initialMonthlyProfits, initialShares, partners, initialMonthId }: ProfitSharingContentProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonthId);
  const [shares, setShares] = useState(initialShares);
  const [loadingShares, setLoadingShares] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'manual'>('all');

  const filteredMonthlyProfits = useMemo(() => {
      if (typeFilter === 'all') return initialMonthlyProfits;
      return initialMonthlyProfits.filter(p => p.fromSystem === (typeFilter === 'system'));
  }, [initialMonthlyProfits, typeFilter]);
  
  const selectedProfitData = useMemo(() => {
    return initialMonthlyProfits.find(p => p.id === selectedMonth);
  }, [selectedMonth, initialMonthlyProfits]);
  
  const totalProfit = selectedProfitData?.totalProfit || 0;
  
  const fetchSharesForMonth = useCallback(async (monthId: string) => {
    setLoadingShares(true);
    const newShares = await getProfitSharesForMonth(monthId);
    setShares(newShares);
    setLoadingShares(false);
  }, []);

  useEffect(() => {
    if (selectedMonth) {
        fetchSharesForMonth(selectedMonth);
    }
  }, [selectedMonth, fetchSharesForMonth]);
  
  useEffect(() => {
      if(filteredMonthlyProfits.length > 0 && !filteredMonthlyProfits.find(p => p.id === selectedMonth)) {
          setSelectedMonth(filteredMonthlyProfits[0].id);
      } else if (filteredMonthlyProfits.length === 0) {
          setSelectedMonth('');
          setShares([]);
      }
  }, [filteredMonthlyProfits, selectedMonth]);
  
  const handleDataChange = () => {
      fetchSharesForMonth(selectedMonth);
  };
  
  const totalPercentage = useMemo(() => shares.reduce((sum, share) => sum + share.percentage, 0), [shares]);
  const totalAmountDistributed = useMemo(() => shares.reduce((sum, share) => sum + share.amount, 0), [shares]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="system">تلقائي</SelectItem>
                <SelectItem value="manual">يدوي</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={filteredMonthlyProfits.length === 0}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر فترة..." />
                </SelectTrigger>
                <SelectContent>
                    {filteredMonthlyProfits.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2">
            <AddManualProfitDialog partners={partners} onSuccess={handleDataChange} />
            <AddEditShareDialog 
                monthId={selectedMonth} 
                totalProfit={totalProfit}
                partners={partners}
                onSuccess={handleDataChange}
                disabled={!selectedProfitData || !selectedProfitData.fromSystem}
            >
                <Button disabled={!selectedProfitData || !selectedProfitData.fromSystem}><PlusCircle className="me-2 h-4 w-4" /> إضافة توزيع</Button>
            </AddEditShareDialog>
        </div>
      </div>
      
       {!selectedProfitData && !loadingShares ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
             <p className="text-muted-foreground">الرجاء اختيار فترة لعرض بياناتها.</p>
          </div>
       ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="💰 صافي الربح للفترة" value={`${totalProfit.toLocaleString()} ${selectedProfitData?.currency || 'USD'}`} />
                <StatCard title="📊 نسبة التوزيع الإجمالية" value={`${totalPercentage.toFixed(2)}%`} />
                <StatCard title="💵 المبلغ الموزع" value={`${totalAmountDistributed.toLocaleString()} ${selectedProfitData?.currency || 'USD'}`} />
            </div>

            {loadingShares ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <SharesTable 
                      shares={shares} 
                      partners={partners} 
                      onDataChange={handleDataChange}
                      totalProfit={totalProfit}
                      currency={selectedProfitData?.currency || 'USD'}
                      isManual={!selectedProfitData?.fromSystem}
                  />
            )}
         </>
       )}

    </div>
  );
}
