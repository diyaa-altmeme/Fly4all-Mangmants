"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Landmark, Search, Calendar as CalendarIcon, Loader2, Filter, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import ClientProfitReportTable from './components/client-profit-report-table';
import SupplierProfitReportTable from './components/supplier-profit-report-table';
import UserSalesReportTable from './components/user-sales-report-table';
import BoxFlowReportTable from './components/box-flow-report-table';
import { getClientProfitReport, getSupplierProfitReport, getUserSalesReport, getBoxFlowReport } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

const reports = [
    { id: 'client_profit', name: 'تقرير أرباح العملاء', description: 'عرض العملاء الأكثر ربحية خلال فترة محددة.', icon: Users, disabled: false },
    { id: 'supplier_profit', name: 'تقرير أرباح الموردين', description: 'عرض الموردين الذين تم تحقيق أعلى أرباح من خلالهم.', icon: Landmark, disabled: false },
    { id: 'user_sales', name: 'تقرير مبيعات المستخدمين', description: 'متابعة أداء المبيعات لكل مستخدم في النظام.', icon: Users, disabled: false },
    { id: 'box_flow', name: 'تقرير حركة الصناديق', description: 'تحليل التدفقات النقدية الداخلة والخارجة لكل صندوق.', icon: Wallet, disabled: false },
];

export default function AdvancedReportsPage() {
    const [selectedReport, setSelectedReport] = useState<string>('client_profit');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [reportData, setReportData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerateReport = useCallback(async () => {
        setIsLoading(true);
        setReportData([]);
        try {
            let data;
            switch(selectedReport) {
                case 'client_profit':
                    data = await getClientProfitReport(dateRange);
                    break;
                case 'supplier_profit':
                    data = await getSupplierProfitReport(dateRange);
                    break;
                case 'user_sales':
                    data = await getUserSalesReport(dateRange);
                    break;
                case 'box_flow':
                    data = await getBoxFlowReport(dateRange);
                    break;
                default:
                    toast({ title: "التقرير غير متاح حاليًا", variant: "destructive" });
                    data = [];
            }
            setReportData(data);
        } catch(e: any) {
            toast({ title: "خطأ", description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [selectedReport, dateRange, toast]);
    
    const renderReportContent = () => {
        if (isLoading) {
            return <Skeleton className="h-64 w-full mt-4" />;
        }
        if (reportData.length === 0) {
            return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg mt-4">
                    <p className="text-muted-foreground">لا توجد بيانات لعرضها. الرجاء توليد التقرير.</p>
                </div>
            )
        }

        switch (selectedReport) {
            case 'client_profit':
                return <ClientProfitReportTable data={reportData} />;
            case 'supplier_profit':
                return <SupplierProfitReportTable data={reportData} />;
            case 'user_sales':
                return <UserSalesReportTable data={reportData} />;
            case 'box_flow':
                return <BoxFlowReportTable data={reportData} />;
            default:
                return <p>نوع التقرير المحدد غير مدعوم حاليًا.</p>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>التقارير المتقدمة</CardTitle>
                <CardDescription>
                    اختر نوع التقرير الذي ترغب في توليده ثم حدد المعايير المطلوبة.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="space-y-2 flex-grow">
                        <Label>نوع التقرير</Label>
                         <Select value={selectedReport} onValueChange={setSelectedReport}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر نوع التقرير..." />
                            </SelectTrigger>
                            <SelectContent>
                                {reports.map(report => (
                                    <SelectItem key={report.id} value={report.id} disabled={report.disabled}>
                                        <div className="flex items-center gap-2">
                                            <report.icon className="h-4 w-4" />
                                            <span>{report.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex items-end gap-2">
                         <div className="grid gap-1">
                            <Label>من تاريخ</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date-from"
                                    variant={"outline"}
                                    className={cn("w-[140px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : <span>اختر</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="single"
                                    selected={dateRange?.from}
                                    onSelect={(day) => setDateRange(prev => ({...prev, from: day}))}
                                />
                                </PopoverContent>
                            </Popover>
                         </div>
                         <div className="grid gap-1">
                             <Label>إلى تاريخ</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date-to"
                                    variant={"outline"}
                                    className={cn("w-[140px] justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : <span>اختر</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="single"
                                    selected={dateRange?.to}
                                    onSelect={(day) => setDateRange(prev => ({...prev, to: day}))}
                                />
                                </PopoverContent>
                            </Popover>
                         </div>
                    </div>
                    <Button onClick={handleGenerateReport} disabled={isLoading}>
                         {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Search className="me-2 h-4 w-4"/>}
                        توليد التقرير
                    </Button>
                </div>

                {renderReportContent()}
            </CardContent>
        </Card>
    );
}
