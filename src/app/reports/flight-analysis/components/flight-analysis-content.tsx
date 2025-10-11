
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FlightDataExtractorDialog from '@/app/bookings/components/flight-data-extractor-dialog';
import FlightReportsTable from './flight-reports-table';
import { useRouter } from 'next/navigation';
import { PlusCircle, Wand2, Search, DollarSign, RefreshCw, Loader2, FileSpreadsheet, Users, User, Baby, UserSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FlightReport, FlightReportWithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { runAdvancedFlightAudit } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import * as XLSX from 'xlsx';
import { isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';


type SortKey = keyof FlightReport | 'totalRevenue' | 'paxCount' | 'filteredRevenue' | 'supplierName' | 'totalDiscount' | 'manualDiscountValue';
type SortDirection = 'ascending' | 'descending';

const SummaryStatCard = ({ title, value, currency, className }: { title: string; value: number; currency: string; className?: string }) => (
    <div className={cn("text-center p-2 rounded-lg bg-background", className)}>
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <p className="font-bold font-mono text-sm">
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
        </p>
    </div>
);


const FinancialSummaryCard = ({ title, summary, currency, className }: { title: string; summary: { totalRevenue: number; totalDiscount: number; manualDiscount: number; filteredRevenue: number; adults: number, children: number, infants: number, returnAdults: number; returnChildren: number; returnInfants: number; paxCount: number, returnPaxCount: number }; currency: string; className?: string }) => (
    <Card className={cn("shadow-sm", className)}>
        <CardHeader className="p-3">
            <CardTitle className="text-base text-center flex flex-col items-center justify-center gap-2">
                <span>{title}</span>
                 <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-base px-3 py-1">
                        <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {summary.paxCount}
                            {summary.returnPaxCount > 0 && <span className="text-xs">({summary.paxCount - summary.returnPaxCount} صافي)</span>}
                        </div>
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                        (<Badge variant="secondary" className="px-1.5 py-0.5"><div className="flex items-center gap-1"><UserSquare className="h-3 w-3" />{summary.adults} {summary.returnAdults > 0 && <span className="text-xs">({summary.adults - summary.returnAdults})</span>}</div></Badge>
                        <Badge variant="secondary" className="px-1.5 py-0.5"><div className="flex items-center gap-1"><User className="h-3 w-3" />{summary.children} {summary.returnChildren > 0 && <span className="text-xs">({summary.children - summary.returnChildren})</span>}</div></Badge>
                        <Badge variant="secondary" className="px-1.5 py-0.5"><div className="flex items-center gap-1"><Baby className="h-3 w-3" />{summary.infants} {summary.returnInfants > 0 && <span className="text-xs">({summary.infants - summary.returnInfants})</span>}</div></Badge>)
                    </div>
                </div>
            </CardTitle>
        </CardHeader>
        <CardContent className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <SummaryStatCard title="الإجمالي" value={summary.totalRevenue} currency={currency} />
            <SummaryStatCard title="خصم العودة" value={summary.totalDiscount} currency={currency} />
            <SummaryStatCard title="خصم يدوي" value={summary.manualDiscount} currency={currency} />
             <SummaryStatCard title="الصافي" value={summary.filteredRevenue} currency={currency} className="bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200" />
        </CardContent>
    </Card>
);

interface FlightAnalysisContentProps {
    initialReports: FlightReportWithId[];
    onRefresh: () => void;
}

export default function FlightAnalysisContent({ initialReports, onRefresh }: FlightAnalysisContentProps) {
    const [allReports, setAllReports] = useState(initialReports);
    const [selectedReports, setSelectedReports] = useState<FlightReportWithId[]>([]);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 5 });
    const [sortDescriptor, setSortDescriptor] = useState<{ column: SortKey, direction: SortDirection }>({ column: 'flightDate', direction: 'descending' });

    useEffect(() => {
        setAllReports(initialReports);
    }, [initialReports]);
    
    const handleUpdateReport = (updatedReport: FlightReportWithId) => {
        setAllReports(produce(draft => {
            const index = draft.findIndex(r => r.id === updatedReport.id);
            if (index !== -1) {
                draft[index] = updatedReport;
            }
        }));
    };

    const handleDeleteReport = (reportId: string) => {
        setAllReports(produce(draft => {
            return draft.filter(r => r.id !== reportId);
        }));
    };

    const handleExport = () => toast({ title: "وظيفة معطلة", description: "تم تعطيل تصدير الملخص مؤقتًا.", variant: "destructive" });
    const handleComprehensiveExport = () => toast({ title: "وظيفة معطلة", description: "تم تعطيل التصدير الشامل مؤقتًا.", variant: "destructive" });

    const sortedReports = useMemo(() => {
        return [...allReports].sort((a, b) => {
            let first: any, second: any;
            if (sortDescriptor.column === 'flightDate') {
                const dateAValue = a.flightDate || '';
                const dateBValue = b.flightDate || '';
                const dateA = isValid(parseISO(dateAValue)) ? parseISO(dateAValue) : new Date(0);
                const dateB = isValid(parseISO(dateBValue)) ? parseISO(dateBValue) : new Date(0);
                first = dateA.getTime();
                second = dateB.getTime();
            } else {
                 first = a[sortDescriptor.column as keyof FlightReport] || 0;
                 second = b[sortDescriptor.column as keyof FlightReport] || 0;
            }

            let cmp = 0;
            if(typeof first === 'string' && typeof second === 'string') {
                cmp = first.localeCompare(second);
            } else if (typeof first === 'number' && typeof second === 'number') {
                cmp = first - second;
            }

            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
    }, [allReports, sortDescriptor]);
    
    const filteredReports = useMemo(() => {
        if (!debouncedSearchTerm) return sortedReports;
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        return sortedReports.filter(report =>
            report.fileName.toLowerCase().includes(lowercasedTerm) ||
            report.route.toLowerCase().includes(lowercasedTerm) ||
            (report.supplierName || '').toLowerCase().includes(lowercasedTerm) ||
            report.pnrGroups.some(pnrGroup =>
                pnrGroup.pnr.toLowerCase().includes(lowercasedTerm) ||
                pnrGroup.bookingReference.toLowerCase().includes(lowercasedTerm) ||
                pnrGroup.passengers.some(p => p.name.toLowerCase().includes(lowercasedTerm))
            )
        );
    }, [sortedReports, debouncedSearchTerm]);

    const paginatedReports = useMemo(() => {
        const { pageIndex, pageSize } = pagination;
        const start = pageIndex * pageSize;
        const end = start + pageSize;
        return filteredReports.slice(start, end);
    }, [filteredReports, pagination]);

    const calculateSummary = (reports: FlightReportWithId[]) => {
      return reports.reduce((acc, report) => {
        acc.totalRevenue += report.totalRevenue || 0;
        acc.totalDiscount += report.totalDiscount || 0;
        acc.manualDiscount += report.manualDiscountValue || 0;
        acc.paxCount += report.paxCount || 0;
        const returnPassengers = (report.passengers || []).filter(p => p.tripType === 'RETURN');
        acc.returnPaxCount += returnPassengers.length;
        const passengerCounts = (report.passengers || []).reduce((acc, p) => {
            const type = p.passengerType || 'Adult'; acc[type] = (acc[type] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        acc.adults += passengerCounts['Adult'] || 0; acc.children += passengerCounts['Child'] || 0; acc.infants += passengerCounts['Infant'] || 0;
        const returnPassengerCounts = returnPassengers.reduce((acc, p) => {
            const type = p.passengerType || 'Adult'; acc[type] = (acc[type] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        acc.returnAdults += returnPassengerCounts['Adult'] || 0; acc.returnChildren += returnPassengerCounts['Child'] || 0; acc.returnInfants += returnPassengerCounts['Infant'] || 0;
        acc.filteredRevenue += report.filteredRevenue || 0;
        return acc;
    }, { totalRevenue: 0, totalDiscount: 0, manualDiscount: 0, filteredRevenue: 0, adults: 0, children: 0, infants: 0, returnAdults: 0, returnChildren: 0, returnInfants: 0, paxCount: 0, returnPaxCount: 0 });
  };

  const totals = React.useMemo(() => calculateSummary(allReports), [allReports]);
  const selectedTotals = React.useMemo(() => calculateSummary(selectedReports), [selectedReports]);

    return (
        <div className="flex flex-col gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>الملخص المالي</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FinancialSummaryCard title="الملخص الإجمالي" summary={totals} currency="USD" />
                    <FinancialSummaryCard title="ملخص المحدد" summary={selectedTotals} currency="USD" className="border-primary" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>أرشيف تقارير الرحلات</CardTitle>
                            <CardDescription>استعراض وتحليل جميع الرحلات التي تم استيرادها إلى النظام.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button onClick={handleComprehensiveExport} variant="outline" disabled={allReports.length === 0}><FileSpreadsheet className="me-2 h-4 w-4"/>تصدير شامل</Button>
                            <Button onClick={handleExport} variant="outline" disabled={allReports.length === 0}><FileSpreadsheet className="me-2 h-4 w-4"/>تصدير الملخص</Button>
                            <Button onClick={onRefresh} variant="outline"><RefreshCw className="h-4 w-4 me-2" /> تحديث البيانات</Button>
                            <FlightDataExtractorDialog onSaveSuccess={onRefresh}>
                                <Button>
                                    <PlusCircle className="h-4 w-4 me-2" />
                                    رفع وتحليل ملف جديد
                                </Button>
                            </FlightDataExtractorDialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="بحث شامل..."
                            className="ps-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <FlightReportsTable 
                        reports={paginatedReports}
                        sortDescriptor={sortDescriptor}
                        setSortDescriptor={setSortDescriptor}
                        onSelectionChange={setSelectedReports}
                        onUpdateReport={handleUpdateReport}
                        onDeleteReport={handleDeleteReport}
                    />
                    <DataTablePagination
                        pageIndex={pagination.pageIndex}
                        pageSize={pagination.pageSize}
                        totalCount={filteredReports.length}
                        onPageChange={(index) => setPagination(prev => ({...prev, pageIndex: index}))}
                        onPageSizeChange={(size) => setPagination({ pageIndex: 0, pageSize: size })}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
