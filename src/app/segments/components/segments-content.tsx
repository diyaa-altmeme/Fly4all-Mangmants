
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SegmentEntry, Client, Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, MoreHorizontal, AlertTriangle, PlusCircle, Search, Filter, Settings, Trash2, GitCompareArrows } from 'lucide-react';
import AddSegmentPeriodDialog from '@/app/segments/components/add-segment-period-dialog';
import EditSegmentPeriodDialog from '@/components/segments/edit-segment-period-dialog';
import SegmentSettingsDialog from '@/components/segments/segment-settings-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SegmentDetailsTable from '@/components/segments/segment-details-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSegments, deleteSegmentPeriod, deleteSegmentEntry } from '../actions';
import { useToast } from '@/hooks/use-toast';
import DeleteSegmentPeriodDialog from '@/components/segments/delete-segment-period-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

const StatCard = ({ title, value, icon: Icon, className }: { title: string; value: string; icon: React.ElementType, className?: string; }) => (
    <Card className={cn("shadow-sm", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

interface SegmentsContentProps {
    initialSegmentEntries: SegmentEntry[];
    clients: Client[];
    suppliers: Supplier[];
}

export default function SegmentsContent({ initialSegmentEntries, clients, suppliers }: SegmentsContentProps) {
    const [segmentEntries, setSegmentEntries] = useState<SegmentEntry[]>(initialSegmentEntries);
    const { toast } = useToast();

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [stagedDateRange, setStagedDateRange] = useState<DateRange | undefined>(undefined);
    const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>(undefined);

    const refreshData = async () => {
        try {
            const segmentsData = await getSegments();
            setSegmentEntries(segmentsData);
        } catch (error) {
            toast({
                title: 'خطأ في تحديث البيانات',
                variant: 'destructive',
            });
        }
    };

    const handleDeletePeriod = async (fromDate: string, toDate: string) => {
        const result = await deleteSegmentPeriod(fromDate, toDate);
        if(result.success) {
            toast({ title: "تم حذف الفترة بنجاح" });
            refreshData();
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    }
    
    const handleDeleteEntry = async (id: string) => {
        const result = await deleteSegmentEntry(id);
        if(result.success) {
            toast({ title: "تم حذف السجل بنجاح" });
            refreshData();
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    }
    
    const handleApplyFilters = () => {
        setAppliedDateRange(stagedDateRange);
    }

    const groupedPeriods = React.useMemo(() => {
        let filteredEntries = segmentEntries;
        
        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            filteredEntries = filteredEntries.filter(entry => 
                entry.companyName.toLowerCase().includes(lowercasedTerm) ||
                entry.partnerName.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        if (appliedDateRange?.from && appliedDateRange?.to) {
            const interval = { start: appliedDateRange.from, end: appliedDateRange.to };
            filteredEntries = filteredEntries.filter(entry => 
                isWithinInterval(parseISO(entry.fromDate), interval) || isWithinInterval(parseISO(entry.toDate), interval)
            );
        }
        
        const groups = filteredEntries.reduce((acc, entry) => {
            const periodKey = `${entry.fromDate} to ${entry.toDate}`;
            if (!acc[periodKey]) {
                acc[periodKey] = {
                    fromDate: entry.fromDate,
                    toDate: entry.toDate,
                    totalTicketProfits: 0,
                    totalOtherProfits: 0,
                    alrawdatainShare: 0,
                    partnerShare: 0,
                    entries: []
                };
            }
            acc[periodKey].totalTicketProfits += entry.ticketProfits;
            acc[periodKey].totalOtherProfits += entry.otherProfits;
            acc[periodKey].alrawdatainShare += entry.alrawdatainShare;
            acc[periodKey].partnerShare += entry.partnerShare;
            acc[periodKey].entries.push(entry);
            return acc;
        }, {} as Record<string, { fromDate: string, toDate: string, totalTicketProfits: number, totalOtherProfits: number, alrawdatainShare: number, partnerShare: number, entries: SegmentEntry[] }>);

        return Object.values(groups).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
    }, [segmentEntries, debouncedSearchTerm, appliedDateRange]);

    const totalAlrawdatainShare = useMemo(() => groupedPeriods.reduce((sum, p) => sum + p.alrawdatainShare, 0), [groupedPeriods]);
    const totalPartnerShare = useMemo(() => groupedPeriods.reduce((sum, p) => sum + p.partnerShare, 0), [groupedPeriods]);
    const totalOverallProfit = totalAlrawdatainShare + totalPartnerShare;

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-end gap-2 flex-wrap">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث بالشركة أو الشريك..."
                            className="ps-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex-grow sm:flex-grow-0">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-[250px] justify-start text-left font-normal",
                                !stagedDateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {stagedDateRange?.from ? (
                                stagedDateRange.to ? (
                                    <>
                                    {format(stagedDateRange.from, "LLL dd, y")} -{" "}
                                    {format(stagedDateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(stagedDateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>اختر فترة</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={stagedDateRange?.from}
                                selected={stagedDateRange}
                                onSelect={setStagedDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <Button onClick={handleApplyFilters}>
                        <Filter className="me-2 h-4 w-4" />
                        تطبيق
                    </Button>
                </div>
                 <div className="flex items-center gap-2">
                    <SegmentSettingsDialog clients={clients} suppliers={suppliers} onSettingsSaved={refreshData} />
                    <AddSegmentPeriodDialog 
                        clients={clients}
                        suppliers={suppliers}
                        onSuccess={refreshData}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={GitCompareArrows} title="إجمالي أرباح السكمنت" value={formatCurrency(totalOverallProfit)} />
                <StatCard icon={GitCompareArrows} title="حصة الروضتين" value={formatCurrency(totalAlrawdatainShare)} className="bg-green-50 dark:bg-green-950/30" />
                <StatCard icon={GitCompareArrows} title="حصة الشريك" value={formatCurrency(totalPartnerShare)} className="bg-blue-50 dark:bg-blue-950/30" />
            </div>

            <div className="rounded-lg border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>الفترة</TableHead>
                            <TableHead>من تاريخ</TableHead>
                            <TableHead>الى تاريخ</TableHead>
                            <TableHead className="text-right">أرباح التذاكر</TableHead>
                            <TableHead className="text-right">الأرباح الأخرى</TableHead>
                            <TableHead className="text-right">حصة الروضتين</TableHead>
                            <TableHead className="text-right">حصة الشريك</TableHead>
                            <TableHead className="text-center">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>

                    {groupedPeriods.length === 0 ? (
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={9} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <AlertTriangle className="h-10 w-10" />
                                        <h3 className="text-lg font-semibold">لا توجد نتائج</h3>
                                        <p className="text-sm">لم يتم العثور على سجلات تطابق الفلاتر المطبقة.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    ) : (
                        groupedPeriods.map((period, index) => (
                            <Collapsible asChild key={index}>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:rotate-180">
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </CollapsibleTrigger>
                                        </TableCell>
                                        <TableCell className="font-medium">فترة #{index + 1}</TableCell>
                                        <TableCell>{period.fromDate}</TableCell>
                                        <TableCell>{period.toDate}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{formatCurrency(period.totalTicketProfits)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{formatCurrency(period.totalOtherProfits)}</TableCell>
                                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(period.alrawdatainShare)}</TableCell>
                                        <TableCell className="text-right font-mono text-blue-600">{formatCurrency(period.partnerShare)}</TableCell>
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <EditSegmentPeriodDialog existingPeriod={period} clients={clients} suppliers={suppliers} onSuccess={refreshData} />
                                                    <DeleteSegmentPeriodDialog onDelete={() => handleDeletePeriod(period.fromDate, period.toDate)} />
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    <CollapsibleContent asChild>
                                        <TableRow>
                                            <TableCell colSpan={9} className="p-0">
                                                <div className="p-4 bg-muted/50">
                                                    <h4 className="font-bold mb-2">تفاصيل الفترة:</h4>
                                                    <SegmentDetailsTable period={period} onDeleteEntry={handleDeleteEntry} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </CollapsibleContent>
                                </TableBody>
                            </Collapsible>
                        ))
                    )}
                </Table>
            </div>
        </div>
    );
}
