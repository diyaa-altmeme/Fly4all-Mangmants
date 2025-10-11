
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FlightDataExtractorDialog from '@/app/bookings/components/flight-data-extractor-dialog';
import FlightAnalysisContent from './components/flight-analysis-content';
import { useRouter } from 'next/navigation';
import { PlusCircle, Wand2, Search, DollarSign, RefreshCw, Loader2, FileSpreadsheet, Users, User, Baby, UserSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FlightReport, FlightReportWithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { runAdvancedFlightAudit } from './actions';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
// import * as XLSX from 'xlsx'; // Temporarily disabled
import { isValid, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';


export default function FlightAnalysisPage() {
    const router = useRouter();
    // حالة لتخزين جميع التقارير
    const [allReports, setAllReports] = useState<FlightReportWithId[]>([]);
    // حالة للتحميل
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    // دالة لجلب وتدقيق البيانات من الخادم
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const reportsData = await runAdvancedFlightAudit();
            setAllReports(reportsData as FlightReportWithId[]);
        } catch (error) {
            toast({
                title: "خطأ",
                description: "فشل في تحميل بيانات تحليل الرحلات.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    // جلب البيانات عند تحميل الصفحة لأول مرة
    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (isLoading) {
        return (
             <div className="flex flex-col gap-6">
                <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
             </div>
        )
    }

    return (
        <FlightAnalysisContent
            initialReports={allReports}
            onRefresh={fetchData}
        />
    );
}

