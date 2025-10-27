
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter, Loader2, RefreshCw, History, GitBranch } from 'lucide-react';
import type { SegmentEntry, Client, Supplier } from '@/lib/types';
import { getSegments, deleteSegmentPeriod } from '@/app/segments/actions';
import AddSegmentPeriodDialog from './add-segment-period-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, MoreHorizontal, Pencil } from 'lucide-react';
import SegmentDetailsTable from '@/components/segments/segment-details-table';
import DeleteSegmentPeriodDialog from '@/components/segments/delete-segment-period-dialog';
import EditSegmentPeriodDialog from './components/edit-segment-period-dialog';
import ProtectedPage from '@/components/auth/protected-page';


const StatCard = ({ title, value, currency, className, arrow }: { title: string; value: number; currency: string; className?: string, arrow?: 'up' | 'down' }) => (
    <div className={cn("text-center p-3 rounded-lg bg-background border", className)}>
        <p className="text-sm text-muted-foreground font-bold">{title}</p>
        <p className="font-bold font-mono text-xl">
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
        </p>
    </div>
);

const PeriodRow = ({ period, index, onDataChange, clients, suppliers }: { period: any, index: number, onDataChange: () => void, clients: Client[], suppliers: Supplier[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const entryUser = period.entries[0]?.enteredBy || 'غير معروف';
    const entryDate = period.entries[0]?.createdAt ? format(parseISO(period.entries[0].createdAt), 'yyyy-MM-dd hh:mm a') : 'N/A';
    
    const invoiceNumber = period.entries[0]?.invoiceNumber || 'N/A';
    const periodNotes = period.entries[0]?.notes || '-';

    const handleDeletePeriod = async () => {
        const { count, error } = await deleteSegmentPeriod(period.periodId);
        if (count > 0 && !error) {
            toast({ title: "تم نقل الفترة إلى المحذوفات" });
            onDataChange();
        } else {
             toast({ title: "لم يتم العثور على الفترة أو حدث خطأ", description: error, variant: "destructive" });
        }
    };
    
    return (
        <Collapsible asChild key={period.periodId} open={isOpen} onOpenChange={setIsOpen}>
             <tbody className={cn("border-t font-bold", period.isConfirmed && "bg-green-500/10")}>
                <TableRow className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <TableCell className="p-1 text-center">
                       <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-center p-2">{invoiceNumber}</TableCell>
                    <TableCell className="p-2 text-center">{period.entries.length > 0 ? period.entries.length : '0'}</TableCell>
                    <TableCell className="font-mono text-center text-xs p-2">{period.fromDate}</TableCell>
                    <TableCell className="font-mono text-center text-xs p-2">{period.toDate}</TableCell>
                     <TableCell className="p-2 text-xs text-center">{periodNotes}</TableCell>
                    <TableCell className="font-mono text-center p-2">{period.totalTickets.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-center p-2">{period.totalOther.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-center text-green-600 p-2">{period.totalAlrawdatainShare.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-center text-blue-600 p-2">{period.totalPartnerShare.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-xs p-2">{entryUser}</TableCell>
                    <TableCell className="p-1 text-center">
                       <EditSegmentPeriodDialog existingPeriod={period} clients={clients} suppliers={suppliers} onSuccess={onDataChange}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Pencil className='h-4 w-4'/></Button>
                       </EditSegmentPeriodDialog>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={13} className="p-0">
                            <div className="p-4 bg-muted/50">
                                <h4 className="font-bold mb-2">تفاصيل شركات الفترة:</h4>
                                <SegmentDetailsTable period={period} onDeleteEntry={() => {}} />
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </tbody>
        </Collapsible>
    )
}

function SegmentsContent() {
    const [segments, setSegments] = useState<SegmentEntry[]>([]);
    const { data: navData, loaded: navDataLoaded, fetchData } = useVoucherNav();
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState<string>('all');
    
    const clients = navData?.clients || [];
    const suppliers = navData?.suppliers || [];
    
    const fetchSegmentData = useCallback(async () => {
        setLoading(true);
        try {
            const segmentData = await getSegments();
            setSegments(segmentData);
        } catch (e: any) {
            toast({ title: "خطأ في تحميل البيانات", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!navDataLoaded) {
          fetchData();
        }
        if(navDataLoaded) {
            fetchSegmentData();
        }
    }, [navDataLoaded, fetchSegmentData]);
    
    const handleSuccess = useCallback(async () => {
        await fetchSegmentData();
    }, [fetchSegmentData]);
    
    const groupedByPeriod = useMemo(() => {
        if (!segments) return {};
        return segments.reduce((acc, entry) => {
            const periodId = entry.periodId || `${entry.fromDate}_${entry.toDate}`;
            if (!acc[periodId]) {
                acc[periodId] = {
                    periodId: periodId, fromDate: entry.fromDate, toDate: entry.toDate, entries: [],
                    totalProfit: 0, totalAlrawdatainShare: 0, totalPartnerShare: 0, totalTickets: 0, totalOther: 0,
                    isConfirmed: entry.isConfirmed, type: 'transaction',
                };
            }
            acc[periodId].entries.push(entry);
            acc[periodId].totalProfit += entry.total || 0;
            acc[periodId].totalAlrawdatainShare += entry.alrawdatainShare || 0;
            acc[periodId].totalPartnerShare += entry.partnerShare || 0;
            acc[periodId].totalTickets += entry.ticketProfits || 0;
            acc[periodId].totalOther += entry.otherProfits || 0;
            return acc;
        }, {} as Record<string, { periodId: string; fromDate: string; toDate: string; entries: SegmentEntry[], totalProfit: number, totalAlrawdatainShare: number, totalPartnerShare: number, totalTickets: number, totalOther: number, isConfirmed?: boolean, type: 'transaction' | 'payment' }>);
    }, [segments]);
    
    const sortedAndFilteredPeriods = useMemo(() => {
         let periods = Object.values(groupedByPeriod).sort((a,b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime());
        if (periodFilter !== 'all') {
            periods = periods.filter(p => p.periodId === periodFilter);
        }
        return periods;
    }, [groupedByPeriod, periodFilter]);

    const { grandTotalProfit, grandTotalAlrawdatainShare, grandTotalPartnerShare } = useMemo(() => {
        return sortedAndFilteredPeriods.reduce((acc: any, period: any) => {
            acc.grandTotalProfit += period.totalProfit;
            acc.grandTotalAlrawdatainShare += period.totalAlrawdatainShare;
            acc.grandTotalPartnerShare += period.totalPartnerShare;
            return acc;
        }, { grandTotalProfit: 0, grandTotalAlrawdatainShare: 0, grandTotalPartnerShare: 0 });
    }, [sortedAndFilteredPeriods]);

    if (loading || !navDataLoaded) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex w-full flex-col items-start gap-4">
                        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                             <div>
                                <CardTitle>سجل حسابات السكمنت</CardTitle>
                                <CardDescription>إدارة وتتبع أرباح وحصص الشركات الشريكة في نظام السكمنت.</CardDescription>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <AddSegmentPeriodDialog clients={clients} suppliers={suppliers} onSuccess={handleSuccess}>
                                     <Button><PlusCircle className="me-2 h-4 w-4" />إضافة سجل جديد</Button>
                                </AddSegmentPeriodDialog>
                                <Button onClick={handleSuccess} variant="outline" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 me-2 animate-spin"/> : <RefreshCw className="h-4 w-4 me-2" />} تحديث
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/segments/deleted-segments"><History className="me-2 h-4 w-4" />سجل المحذوفات</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                     <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <StatCard title="إجمالي أرباح السكمنت" value={grandTotalProfit} currency="USD" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30" />
                        <StatCard title="حصة الروضتين" value={grandTotalAlrawdatainShare} currency="USD" className="border-green-500/50 bg-green-50 dark:bg-green-950/30" />
                        <StatCard title="حصة الشريك" value={grandTotalPartnerShare} currency="USD" className="border-purple-500/50 bg-purple-50 dark:bg-purple-950/30" />
                    </div>
                </CardHeader>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>ملخص الفترات المحاسبية</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px] p-1"></TableHead>
                                    <TableHead className="font-bold text-center p-2">رقم الفاتورة</TableHead>
                                    <TableHead className="font-bold text-center p-2">الشركات</TableHead>
                                    <TableHead className="font-bold text-center p-2">من</TableHead>
                                    <TableHead className="font-bold text-center p-2">إلى</TableHead>
                                    <TableHead className="font-bold text-center p-2">الملاحظات</TableHead>
                                    <TableHead className="text-center font-bold p-2">أرباح التذاكر</TableHead>
                                    <TableHead className="text-center font-bold p-2">أرباح أخرى</TableHead>
                                    <TableHead className="text-center font-bold p-2">حصة الروضتين</TableHead>
                                    <TableHead className="text-center font-bold p-2">حصة الشريك</TableHead>
                                    <TableHead className="font-bold text-center p-2">الموظف</TableHead>
                                    <TableHead className="text-center p-2">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            {sortedAndFilteredPeriods.length === 0 ? (
                                <TableBody>
                                    <TableRow><TableCell colSpan={13} className="text-center h-24">لا توجد بيانات للفترة المحددة.</TableCell></TableRow>
                                </TableBody>
                            ) : sortedAndFilteredPeriods.map((period, idx) => (
                                <PeriodRow
                                    key={period.periodId}
                                    period={period}
                                    index={idx}
                                    clients={clients}
                                    suppliers={suppliers}
                                    onDataChange={handleSuccess}
                                />
                            ))}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function SegmentsPage() {
  return (
    <ProtectedPage requiredPermission="segments:read">
      <SegmentsContent />
    </ProtectedPage>
  );
}
