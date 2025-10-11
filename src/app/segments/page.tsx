
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Users, BarChart3, MoreHorizontal, Edit, Trash2, Loader2, GitBranch } from 'lucide-react';
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


const StatCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-muted/50 p-3 rounded-lg text-center">
        <p className="text-xs text-muted-foreground font-semibold">{title}</p>
        <p className="font-bold text-base font-mono">{value}</p>
    </div>
);


export default function SegmentsPage() {
    const [segments, setSegments] = useState<SegmentEntry[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

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
                    totalPartnerShare: 0
                };
            }
            acc[periodKey].entries.push(entry);
            acc[periodKey].totalProfit += entry.total;
            acc[periodKey].totalAlrawdatainShare += entry.alrawdatainShare;
            acc[periodKey].totalPartnerShare += entry.partnerShare;
            return acc;
        }, {} as Record<string, { fromDate: string; toDate: string; entries: SegmentEntry[], totalProfit: number, totalAlrawdatainShare: number, totalPartnerShare: number }>);
    }, [segments]);
    
    const sortedPeriods = useMemo(() => Object.values(groupedByPeriod).sort((a,b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime()), [groupedByPeriod]);

    const handleDeletePeriod = async (fromDate: string, toDate: string) => {
        const result = await deleteSegmentPeriod(fromDate, toDate);
        if (result.success) {
            toast({ title: `تم حذف الفترة و ${result.count} سجلات بنجاح` });
            fetchData();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    }
    
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
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>إدارة السكمنت</CardTitle>
                        <CardDescription>
                            عرض وإدارة سجلات السكمنت الشهرية وتوزيع الأرباح بين الشركاء.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <SegmentSettingsDialog clients={clients} onSettingsSaved={fetchData} />
                         <AddSegmentPeriodDialog clients={clients} suppliers={suppliers} onSuccess={fetchData} />
                    </div>
                </CardHeader>
             </Card>
            
            <Accordion type="single" collapsible defaultValue={sortedPeriods[0] ? `${sortedPeriods[0].fromDate}_${sortedPeriods[0].toDate}`: ''}>
                {sortedPeriods.map(period => (
                    <AccordionItem value={`${period.fromDate}_${period.toDate}`} key={`${period.fromDate}_${period.toDate}`}>
                        <div className="p-4 bg-card rounded-lg shadow-sm flex items-center justify-between w-full">
                           <AccordionTrigger className="p-0 font-bold text-lg hover:no-underline flex-grow">
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary"/>
                                    <span>الفترة المحاسبية</span>
                                </div>
                                <span>{period.fromDate}</span>
                                <span>إلى</span>
                                <span>{period.toDate}</span>
                             </div>
                           </AccordionTrigger>
                           <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                     <EditSegmentPeriodDialog existingPeriod={period} clients={clients} suppliers={suppliers} onSuccess={fetchData} />
                                     <DeleteSegmentPeriodDialog onDelete={() => handleDeletePeriod(period.fromDate, period.toDate)} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                           </div>
                        </div>
                        <AccordionContent className="p-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <StatCard title="إجمالي ربح الفترة" value={`$${period.totalProfit.toFixed(2)}`} />
                                <StatCard title="إجمالي حصة الروضتين" value={`$${period.totalAlrawdatainShare.toFixed(2)}`} />
                                <StatCard title="إجمالي حصة الشركاء" value={`$${period.totalPartnerShare.toFixed(2)}`} />
                            </div>
                            <SegmentDetailsTable period={period} onDeleteEntry={() => {}} />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
             {sortedPeriods.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg">
                    <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">لا توجد سجلات سكمنت لعرضها. ابدأ بإضافة سجل جديد.</p>
                </div>
            )}
        </div>
    )
}
