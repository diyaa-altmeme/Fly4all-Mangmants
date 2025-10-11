
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, Download, FileSpreadsheet, Search, Users, User, ArrowDown, ArrowUp, DollarSign, Baby, AlertTriangle, ExternalLink, Trash2, Checkbox } from 'lucide-react';
import type { FlightReportWithId, DataAuditIssue } from '@/lib/types';
import FlightDataExtractorDialog from '@/app/bookings/components/flight-data-extractor-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { deleteFlightReport } from '../actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';


const StatCard = ({ title, value, subValue, icon: Icon, valueClass }: { title: string, value: string, subValue?: string, icon: React.ElementType, valueClass?: string }) => (
    <div className="bg-muted/50 p-4 rounded-xl flex items-center gap-4">
        <div className="p-3 bg-background rounded-full">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold font-mono", valueClass)}>{value}</p>
            {subValue && <p className="text-xs text-muted-foreground font-mono">{subValue}</p>}
        </div>
    </div>
);

const IssueDetailsDialog = ({ issue }: { issue: DataAuditIssue }) => {
    const typeConfig: Record<DataAuditIssue['type'], { label: string }> = {
        DUPLICATE_PNR: { label: "تكرار PNR" },
        NEGATIVE_PROFIT: { label: "ربح سالب" },
        ZERO_PRICE: { label: "سعر صفري" },
        COMMISSION_ERROR: { label: "خطأ في العمولة" },
        INVOICE_ERROR: { label: "خطأ في الفاتورة" },
        SAVE_ERROR: { label: "خطأ في الحفظ" },
        COST_MISMATCH: { label: "عدم تطابق الكلفة" },
        UNMATCHED_RETURN: { label: "رحلة ذهاب وعودة" },
        DUPLICATE_FILE: { label: "ملف مكرر" },
    };
    const config = typeConfig[issue.type];

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>تفاصيل المشكلة: {config?.label || issue.type}</DialogTitle>
                <DialogDescription>{issue.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {issue.type === 'DUPLICATE_PNR' && issue.details && Array.isArray(issue.details) && (
                    <div>
                        <h4 className="font-bold mb-2">الحجوزات المكررة لـ PNR: {issue.pnr}</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>رقم الفاتورة</TableHead>
                                    <TableHead>الإجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {issue.details.map((detail: any) => (
                                    <TableRow key={detail.id}>
                                        <TableCell>{detail.invoice || detail.id}</TableCell>
                                        <TableCell>
                                            <Button asChild variant="secondary" size="sm">
                                                <Link href={`/bookings?search=${issue.pnr}&searchField=pnr`} target="_blank">
                                                    الذهاب للحجز <ExternalLink className="h-3 w-3 ms-2"/>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </DialogContent>
    )
};


const IssueBadge = ({ issue }: { issue: DataAuditIssue }) => {
    const config = {
        'DUPLICATE_PNR': { label: 'تكرار', variant: 'destructive' as const },
        'UNMATCHED_RETURN': { label: 'ذهاب وعودة', variant: 'secondary' as const },
    }[issue.type] || { label: issue.type, variant: 'outline' as const };
    
    return <Badge variant={config.variant}>{config.label} ({issue.details?.length || 'N/A'})</Badge>
}

export default function FlightAnalysisContent({ initialReports }: { initialReports: Partial<FlightReportWithId>[] }) {
    const [reports, setReports] = useState(initialReports);
    const [selectedReport, setSelectedReport] = useState<Partial<FlightReportWithId> | null>(null);
    const { toast } = useToast();

    const handleSuccess = () => {
        // Here you would typically refetch the data
        toast({ title: 'Success', description: 'Action completed.' });
    };

    const handleDelete = async (id: string) => {
        const result = await deleteFlightReport(id);
        if (result.success) {
            setReports(prev => prev.filter(r => r.id !== id));
            toast({ title: 'تم حذف التقرير' });
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const overallSummary = useMemo(() => {
        let totalPax = 0, totalRevenue = 0, totalReturnDiscount = 0, totalManualDiscount = 0;
        let adultCount = 0, childCount = 0, infantCount = 0;

        reports.forEach(report => {
            totalPax += report.paxCount || 0;
            totalRevenue += report.totalRevenue || 0;
            totalReturnDiscount += report.pnrGroups?.reduce((sum, g) => sum + (g.passengers.some(p => p.tripType === 'ROUND_TRIP') ? 145 : 0), 0) || 0;
            totalManualDiscount += report.manualDiscountValue || 0;
            
            report.passengers?.forEach(p => {
                if(p.passengerType === 'Adult') adultCount++;
                else if(p.passengerType === 'Child') childCount++;
                else if (p.passengerType === 'Infant') infantCount++;
            });
        });
        
        return {
            totalPax, totalRevenue, totalReturnDiscount, totalManualDiscount,
            netRevenue: totalRevenue - totalReturnDiscount - totalManualDiscount,
            adultCount, childCount, infantCount,
        }
    }, [reports]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>الملخص المالي</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader><CardTitle className="text-lg">الملخص الإجمالي</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="صافي" value={`$${overallSummary.netRevenue.toLocaleString()}`} icon={DollarSign} valueClass="text-green-600" />
                            <StatCard title="خصم يدوي" value={`$${overallSummary.totalManualDiscount.toLocaleString()}`} icon={ArrowDown} valueClass="text-red-500" />
                            <StatCard title="خصم العودة" value={`$${overallSummary.totalReturnDiscount.toLocaleString()}`} icon={ArrowDown} valueClass="text-red-500" />
                             <StatCard title="الإجمالي" value={`$${overallSummary.totalRevenue.toLocaleString()}`} icon={DollarSign} />
                        </CardContent>
                     </Card>
                     <Card>
                         <CardHeader><CardTitle className="text-lg">ملخص المحدد</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                           <StatCard title="صافي" value="$0" icon={DollarSign} valueClass="text-green-600" />
                           <StatCard title="خصم يدوي" value="$0" icon={ArrowDown} valueClass="text-red-500" />
                           <StatCard title="خصم العودة" value="$0" icon={ArrowDown} valueClass="text-red-500" />
                           <StatCard title="الإجمالي" value="$0" icon={DollarSign} />
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>أرشيف تقارير الرحلات</CardTitle>
                        <CardDescription>استعراض وتحليل جميع الرحلات التي تم استيرادها إلى النظام.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <FlightDataExtractorDialog onSaveSuccess={handleSuccess}>
                            <Button>
                                <PlusCircle className="me-2 h-4 w-4" />
                                رفع وتحليل ملف جديد
                            </Button>
                        </FlightDataExtractorDialog>
                        <Button variant="outline"><RefreshCw className="me-2 h-4 w-4" />تحديث البيانات</Button>
                        <Button variant="outline"><FileSpreadsheet className="me-2 h-4 w-4" />تصدير الملخص</Button>
                        <Button variant="outline"><FileSpreadsheet className="me-2 h-4 w-4" />تصدير شامل</Button>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="relative mb-4">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="بحث شامل..." className="ps-10" />
                    </div>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>التحاسب</TableHead>
                                    <TableHead>المصدر</TableHead>
                                    <TableHead>الوجهة</TableHead>
                                    <TableHead>تاريخ الرحلة</TableHead>
                                    <TableHead>الوقت</TableHead>
                                    <TableHead>المسافرون</TableHead>
                                    <TableHead>الإجمالي</TableHead>
                                    <TableHead>خصم تلقائي</TableHead>
                                    <TableHead>خصم يدوي</TableHead>
                                    <TableHead>الصافي</TableHead>
                                    <TableHead>تحليل الملف</TableHead>
                                    <TableHead>الـ B.R المكررة</TableHead>
                                    <TableHead>تحليل الرحلة</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report, index) => (
                                    <TableRow key={report.id || index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell><Checkbox /></TableCell>
                                        <TableCell>{report.supplierName}</TableCell>
                                        <TableCell>{report.route}</TableCell>
                                        <TableCell>{report.flightDate}</TableCell>
                                        <TableCell>{report.flightTime}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                <span>{report.paxCount}</span>
                                                <span className="text-xs text-muted-foreground">({(report.passengers?.filter(p => p.passengerType === 'Adult').length || 0)} بالغ)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">${report.totalRevenue?.toLocaleString()}</TableCell>
                                        <TableCell className="font-mono text-red-500">${report.pnrGroups?.reduce((sum, g) => sum + (g.passengers.some(p => p.tripType === 'ROUND_TRIP') ? 145 : 0), 0).toLocaleString()}</TableCell>
                                        <TableCell className="font-mono text-red-500">${(report.manualDiscountValue || 0).toLocaleString()}</TableCell>
                                        <TableCell className="font-mono font-bold">${((report.totalRevenue || 0) - (report.pnrGroups?.reduce((sum, g) => sum + (g.passengers.some(p => p.tripType === 'ROUND_TRIP') ? 145 : 0), 0) || 0) - (report.manualDiscountValue || 0)).toLocaleString()}</TableCell>
                                        <TableCell>سليم</TableCell>
                                        <TableCell>
                                            {report.issues?.duplicatePnr && report.issues.duplicatePnr.length > 0
                                                ? <IssueBadge issue={report.issues.duplicatePnr[0]} />
                                                : "سليم"
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {report.issues?.tripAnalysis && report.issues.tripAnalysis.length > 0
                                                ? <IssueBadge issue={report.issues.tripAnalysis[0]} />
                                                : "سليم"
                                            }
                                        </TableCell>
                                        <TableCell>
                                             <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
