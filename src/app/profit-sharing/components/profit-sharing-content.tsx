
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
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value }: { title: string; value: string }) => (
    <div className="bg-muted/50 border p-4 rounded-lg text-center">
        <p className="text-sm text-muted-foreground font-bold">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);

interface ProfitSharingContentProps {
  initialMonthlyProfits: MonthlyProfit[];
  initialShares: ProfitShare[];
  partners: { id: string; name: string; type: string }[];
  initialMonthId: string;
}

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
      // This should trigger a re-fetch at the page level in a real app
      // For now, we'll re-fetch what this component can control.
      fetchSharesForMonth(selectedMonth);
  };
  
  const totalPercentage = useMemo(() => shares.reduce((sum, share) => sum + share.percentage, 0), [shares]);
  const totalAmountDistributed = useMemo(() => shares.reduce((sum, share) => sum + share.amount, 0), [shares]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="💰 صافي الربح للفترة" value={`${totalProfit.toLocaleString()} ${selectedProfitData?.currency || 'USD'}`} />
            <StatCard title="📊 نسبة التوزيع الإجمالية" value={`${totalPercentage.toFixed(2)}%`} />
            <StatCard title="💵 المبلغ الموزع" value={`${totalAmountDistributed.toLocaleString()} ${selectedProfitData?.currency || 'USD'}`} />
        </div>

        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>الفترات المحاسبية للأرباح</CardTitle>
                    <CardDescription>اختر فترة لعرض توزيع حصصها في الجدول السفلي.</CardDescription>
                </div>
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
                     <AddManualProfitDialog partners={partners} onSuccess={handleDataChange} />
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الوصف</TableHead>
                                <TableHead>تاريخ البدء</TableHead>
                                <TableHead>تاريخ الانتهاء</TableHead>
                                <TableHead className="text-right">إجمالي الربح</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMonthlyProfits.map(p => {
                                const description = p.notes || (p.fromSystem ? `أرباح شهر ${p.id}` : 'فترة يدوية');
                                const dateInfo = description.match(/من ([\d-]+) إلى ([\d-]+)/);
                                let fromDate = p.fromSystem ? format(parseISO(`${p.id}-01`), 'yyyy-MM-dd') : (dateInfo ? dateInfo[1] : '-');
                                let toDate = p.fromSystem ? '-' : (dateInfo ? dateInfo[2] : '-');
                                
                                return (
                                    <TableRow
                                        key={p.id}
                                        className={cn("cursor-pointer", selectedMonth === p.id && "bg-muted font-bold")}
                                        onClick={() => setSelectedMonth(p.id)}
                                    >
                                        <TableCell className="font-semibold">{description.split(' | ')[0]}</TableCell>
                                        <TableCell>{fromDate}</TableCell>
                                        <TableCell>{toDate}</TableCell>
                                        <TableCell className="text-right font-mono">{p.totalProfit.toLocaleString()} {p.currency || 'USD'}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      
       {!selectedProfitData && !loadingShares ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
             <p className="text-muted-foreground">الرجاء اختيار فترة لعرض بياناتها.</p>
          </div>
       ) : (
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>تفاصيل توزيع الحصص</CardTitle>
                        <CardDescription>
                            حصص الشركاء والمساهمين من أرباح الفترة المحددة.
                        </CardDescription>
                    </div>
                     <AddEditShareDialog 
                        monthId={selectedMonth} 
                        totalProfit={totalProfit}
                        partners={partners}
                        onSuccess={handleDataChange}
                        disabled={!selectedProfitData || !selectedProfitData.fromSystem}
                    >
                        <Button disabled={!selectedProfitData || !selectedProfitData.fromSystem}><PlusCircle className="me-2 h-4 w-4" /> إضافة توزيع</Button>
                    </AddEditShareDialog>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
         )}

    </div>
  );
}
