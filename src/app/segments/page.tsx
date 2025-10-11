
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Users, BarChart3, MoreHorizontal, Edit, Trash2, Loader2, GitBranch, Filter, Search, RefreshCw, HandCoins } from 'lucide-react';
import type { SegmentEntry, Client, Supplier } from '@/lib/types';
import { getSegments, deleteSegmentPeriod } from './actions';
import { getClients } from '@/app/relations/actions';
import { getSuppliers } from '@/app/suppliers/actions';
import AddSegmentPeriodDialog from './add-segment-period-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import SegmentDetailsTable from '@/components/segments/segment-details-table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import DeleteSegmentPeriodDialog from '@/components/segments/delete-segment-period-dialog';
import EditSegmentPeriodDialog from '@/components/segments/edit-segment-period-dialog';
import SegmentSettingsDialog from '@/components/segments/segment-settings-dialog';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';


const StatCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-muted/50 p-4 rounded-lg text-center flex-1">
        <p className="text-sm text-muted-foreground font-semibold">{title}</p>
        <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
);


export default function SegmentsPage() {
    const [segments, setSegments] = useState<SegmentEntry[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [date, setDate] = React.useState<DateRange | undefined>();

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

        if (date?.from && date?.to) {
            periods = periods.filter(p => {
                const periodDate = new Date(p.fromDate);
                return periodDate >= date.from! && periodDate <= date.to!;
            });
        }
        
        return periods;

    }, [groupedByPeriod, debouncedSearchTerm, date]);

    const handleDeletePeriod = async (fromDate: string, toDate: string) => {
        const result = await deleteSegmentPeriod(fromDate, toDate);
        if (result.success) {
            toast({ title: `تم حذف الفترة و ${result.count} سجلات بنجاح` });
            fetchData();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    }
    
    const { grandTotalProfit, grandTotalAlrawdatainShare, grandTotalPartnerShare } = useMemo(() => {
        return sortedAndFilteredPeriods.reduce((acc, period) => {
            acc.grandTotalProfit += period.totalProfit;
            acc.grandTotalAlrawdatainShare += period.totalAlrawdatainShare;
            acc.grandTotalPartnerShare += period.totalPartnerShare;
            return acc;
        }, { grandTotalProfit: 0, grandTotalAlrawdatainShare: 0, grandTotalPartnerShare: 0 });
    }, [sortedAndFilteredPeriods]);

    if (loading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>سجل حسابات السكمنت</CardTitle>
                            <CardDescription>
                                عرض ملخص الفترات المحاسبية للسكمنت.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <SegmentSettingsDialog clients={clients} onSettingsSaved={fetchData} />
                             <AddSegmentPeriodDialog clients={clients} suppliers={suppliers} onSuccess={fetchData} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative flex-grow">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="بحث بالشركة أو الشريك..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="ps-10"
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn("w-full sm:w-[250px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>اختر فترة</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarUI initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                         <Button onClick={() => { setSearchTerm(''); setDate(undefined); }} variant="ghost" className={!searchTerm && !date ? 'hidden' : ''}>مسح</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="إجمالي أرباح السكمنت" value={`$${grandTotalProfit.toFixed(2)}`} />
                        <StatCard title="حصة الروضتين" value={`$${grandTotalAlrawdatainShare.toFixed(2)}`} />
                        <StatCard title="حصة الشريك" value={`$${grandTotalPartnerShare.toFixed(2)}`} />
                    </div>
                </CardContent>
            </Card>

            <Accordion type="single" collapsible defaultValue={sortedAndFilteredPeriods[0] ? `${sortedAndFilteredPeriods[0].fromDate}_${sortedAndFilteredPeriods[0].toDate}`: ''}>
                {sortedAndFilteredPeriods.map((period, idx) => (
                    <AccordionItem value={`${period.fromDate}_${period.toDate}`} key={`${period.fromDate}_${period.toDate}`}>
                        <div className="p-4 bg-card rounded-lg shadow-sm flex items-center justify-between w-full border">
                           <AccordionTrigger className="p-0 font-bold text-lg hover:no-underline flex-grow">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full text-sm">
                                    <div className="flex items-center gap-2 font-bold"><Badge>فترة #{sortedAndFilteredPeriods.length - idx}</Badge></div>
                                    <div className="flex items-center gap-2"><span className="text-muted-foreground">من:</span> {period.fromDate}</div>
                                    <div className="flex items-center gap-2"><span className="text-muted-foreground">إلى:</span> {period.toDate}</div>
                                    <div className="flex items-center gap-2 font-bold"><span className="text-muted-foreground">إجمالي الربح:</span> <span className="font-mono">{period.totalProfit.toFixed(2)}</span></div>
                                    <div className="flex items-center gap-2 font-bold"><span className="text-muted-foreground">حصة الشركة:</span> <span className="font-mono text-blue-600">{period.totalAlrawdatainShare.toFixed(2)}</span></div>
                                    <div className="flex items-center gap-2 font-bold"><span className="text-muted-foreground">حصة الشريك:</span> <span className="font-mono text-green-600">{period.totalPartnerShare.toFixed(2)}</span></div>
                                </div>
                           </AccordionTrigger>
                           <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                     <EditSegmentPeriodDialog existingPeriod={period} clients={clients} suppliers={suppliers} onSuccess={fetchData} />
                                     <DeleteSegmentPeriodDialog onDelete={() => handleDeletePeriod(period.fromDate, period.toDate)} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                           </div>
                        </div>
                        <AccordionContent className="p-2 md:p-4 border-x border-b rounded-b-lg">
                            <SegmentDetailsTable period={period} onDeleteEntry={() => {}} />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
             {sortedAndFilteredPeriods.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg">
                    <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">لا توجد سجلات سكمنت لعرضها.</p>
                </div>
            )}
        </div>
    )
}
