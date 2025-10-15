"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Users, BarChart3, MoreHorizontal, Edit, Trash2, Loader2, GitBranch, Filter, Search, RefreshCw, HandCoins, ChevronDown, BadgeCent, DollarSign } from 'lucide-react';
import type { SegmentEntry, Client, Supplier } from '@/lib/types';
import { getSegments, deleteSegmentPeriod } from '@/app/segments/actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import AddSegmentPeriodDialog from './components/add-segment-period-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SegmentDetailsTable from '@/components/segments/segment-details-table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import DeleteSegmentPeriodDialog from '@/components/segments/delete-segment-period-dialog';
import EditSegmentPeriodDialog from '@/app/segments/components/edit-segment-period-dialog';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { produce } from 'immer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StatCard = ({ title, value, currency, className, arrow }: { title: string; value: number; currency: string; className?: string, arrow?: 'up' | 'down' }) => (
    <div className={cn("text-center p-3 rounded-lg bg-background border", className)}>
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <p className="font-bold font-mono text-base">
            {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {currency}
        </p>
    </div>
);

const PeriodRow = ({ period, index, clients, suppliers, onDataChange }: { period: any, index: number, clients: Client[], suppliers: Supplier[], onDataChange: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const entryUser = period.entries[0]?.enteredBy || 'غير معروف';
    const entryDate = period.entries[0]?.createdAt ? format(parseISO(period.entries[0].createdAt), 'yyyy-MM-dd hh:mm a') : 'N/A';


    const handleDeletePeriod = async (fromDate: string, toDate: string) => {
        await deleteSegmentPeriod(fromDate, toDate);
        onDataChange();
    };

    return (
        <Collapsible asChild key={`${period.fromDate}_${period.toDate}`} open={isOpen} onOpenChange={setIsOpen}>
             <tbody className="border-t">
                <TableRow className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <TableCell className="p-1 text-center">
                       <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-semibold p-1 text-center">{period.entries.length > 0 ? period.entries.length : '0'}</TableCell>
                    <TableCell className="font-mono text-center text-xs">{period.fromDate}</TableCell>
                    <TableCell className="font-mono text-center text-xs">{period.toDate}</TableCell>
                    <TableCell className="font-mono text-center text-xs">{entryUser}</TableCell>
                    <TableCell className="font-mono text-center text-xs">{entryDate}</TableCell>
                    <TableCell className="text-center font-mono p-1 text-xs">{period.totalTickets.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono p-1 text-xs">{period.totalOther.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono text-green-600 p-1 text-xs">{period.totalAlrawdatainShare.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono text-blue-600 p-1 text-xs">{period.totalPartnerShare.toFixed(2)}</TableCell>
                    <TableCell className="p-1 text-center">
                        <div className="flex items-center justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <EditSegmentPeriodDialog existingPeriod={period} clients={clients} suppliers={suppliers} onSuccess={onDataChange} />
                                    <DeleteSegmentPeriodDialog onDelete={() => handleDeletePeriod(period.fromDate, period.toDate)} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={11} className="p-0">
                            <div className="p-4 bg-muted/30">
                                <h4 className="font-bold mb-2">تفاصيل شركات الفترة:</h4>
                                <SegmentDetailsTable period={period} onDeleteEntry={() => {}} />
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </tbody>
        </Collapsible>
    );
};


export default function SegmentsPage() {
    const [segments, setSegments] = useState<SegmentEntry[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [periodFilter, setPeriodFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [segmentData, clientData, supplierData] = await Promise.all([
                getSegments(),
                getClients({all: true}),
                getSuppliers({all: true})
            ]);
            setSegments(segmentData);
            setClients(clientData.clients);
            setSuppliers(supplierData);
        } catch (e: any) {
            toast({ title: "خطأ في تحميل البيانات", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    const handleSuccess = useCallback((newEntries?: SegmentEntry[]) => {
      if (newEntries && newEntries.length > 0) {
        setSegments(prev => {
            const newPeriodKey = `${newEntries[0].fromDate}_${newEntries[0].toDate}`;
            const existingPeriodIndex = prev.findIndex(p => `${p.fromDate}_${p.toDate}` === newPeriodKey);
            
            if (existingPeriodIndex > -1) {
                // This logic is complex, a full refetch is safer for now.
                fetchData();
                return prev;
            } else {
                 return [...newEntries, ...prev].sort((a,b) => parseISO(b.toDate).getTime() - parseISO(a.toDate).getTime());
            }
        });
      } else {
         fetchData();
      }
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const groupedByPeriod = useMemo(() => {
        return segments.reduce((acc, entry) => {
            const periodKey = `${entry.fromDate}_${entry.toDate}`;
            if (!acc[periodKey]) {
                acc[periodKey] = {
                    fromDate: entry.fromDate,
                    toDate: entry.toDate,
                    entries: [],
                    totalProfit: 0,
                    totalAlrawdatainShare: 0,
                    totalPartnerShare: 0,
                    totalTickets: 0,
                    totalOther: 0,
                };
            }
            acc[periodKey].entries.push(entry);
            acc[periodKey].totalProfit += entry.total;
            acc[periodKey].totalAlrawdatainShare += entry.alrawdatainShare;
            acc[periodKey].totalPartnerShare += entry.partnerShare;
            acc[periodKey].totalTickets += entry.ticketProfits;
            acc[periodKey].totalOther += entry.otherProfits;
            return acc;
        }, {} as Record<string, { fromDate: string; toDate: string; entries: SegmentEntry[], totalProfit: number, totalAlrawdatainShare: number, totalPartnerShare: number, totalTickets: number, totalOther: number }>);
    }, [segments]);
    
    const sortedAndFilteredPeriods = useMemo(() => {
         let periods = Object.values(groupedByPeriod).sort((a,b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime());
        
        if (debouncedSearchTerm) {
            periods = periods.filter(p => 
                p.entries.some(e => 
                    e.companyName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                    e.partnerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                )
            );
        }
        
        if (periodFilter !== 'all') {
            periods = periods.filter(p => `${p.fromDate}_${p.toDate}` === periodFilter);
        }
        
        return periods;

    }, [groupedByPeriod, debouncedSearchTerm, periodFilter]);

    const { grandTotalProfit, grandTotalAlrawdatainShare, grandTotalPartnerShare } = useMemo(() => {
        return sortedAndFilteredPeriods.reduce((acc, period) => {
            acc.grandTotalProfit += period.totalProfit;
            acc.grandTotalAlrawdatainShare += period.totalAlrawdatainShare;
            acc.grandTotalPartnerShare += period.totalPartnerShare;
            return acc;
        }, { grandTotalProfit: 0, grandTotalAlrawdatainShare: 0, grandTotalPartnerShare: 0 });
    }, [sortedAndFilteredPeriods]);

    const periodOptions = useMemo(() => {
        return Object.values(groupedByPeriod)
            .sort((a,b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime())
            .map(p => ({
                value: `${p.fromDate}_${p.toDate}`,
                label: `${p.fromDate} -> ${p.toDate}`
            }));
    }, [groupedByPeriod]);

    if (loading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle>سجل حسابات السكمنت</CardTitle>
                            <CardDescription>عرض ملخص الفترات المحاسبية للسكمنت.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="بحث بالشركة أو الشريك..."
                                    className="ps-10 h-8"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={periodFilter} onValueChange={setPeriodFilter}>
                                <SelectTrigger className="w-full sm:w-[250px] h-8">
                                    <SelectValue placeholder="اختر فترة..."/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الفترات</SelectItem>
                                    {periodOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <AddSegmentPeriodDialog clients={clients} suppliers={suppliers} onSuccess={handleSuccess} />
                            <Button onClick={fetchData} variant="outline" size="icon" disabled={loading} className="h-8 w-8">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4" />}
                            </Button>
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
                                    <TableHead className="w-[40px] p-1"></TableHead>
                                    <TableHead className="font-bold text-center p-2">الشركات</TableHead>
                                    <TableHead className="font-bold text-center p-2">من</TableHead>
                                    <TableHead className="font-bold text-center p-2">إلى</TableHead>
                                    <TableHead className="font-bold text-center p-2">موظف الإدخال</TableHead>
                                    <TableHead className="font-bold text-center p-2">تاريخ الإدخال</TableHead>
                                    <TableHead className="text-center font-bold p-2">أرباح التذاكر</TableHead>
                                    <TableHead className="text-center font-bold p-2">أرباح أخرى</TableHead>
                                    <TableHead className="text-center font-bold p-2">حصة الروضتين</TableHead>
                                    <TableHead className="text-center font-bold p-2">حصة الشريك</TableHead>
                                    <TableHead className="text-center font-bold p-2">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            {sortedAndFilteredPeriods.length === 0 ? (
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center h-24">لا توجد بيانات للفترة المحددة.</TableCell>
                                    </TableRow>
                                </TableBody>
                            ) : sortedAndFilteredPeriods.map((period, idx) => (
                                <PeriodRow
                                    key={`${period.fromDate}_${period.toDate}`}
                                    period={period}
                                    index={idx}
                                    clients={clients}
                                    suppliers={suppliers}
                                    onDataChange={fetchData}
                                />
                            ))}
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}