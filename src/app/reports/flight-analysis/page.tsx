
"use client";

import * as React from "react";
import { getFlightReports, deleteFlightReport } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { FlightReport } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FlightDataExtractorDialog from "@/app/bookings/components/flight-data-extractor-dialog";

export default function FlightAnalysisPage() {
    const [reports, setReports] = React.useState<FlightReport[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    const fetchReports = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getFlightReports();
            setReports(data);
        } catch (error) {
            console.error(error);
            toast({ title: 'فشل تحميل التقارير', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDelete = async (id: string) => {
        const result = await deleteFlightReport(id);
        if (result.success) {
            toast({ title: 'تم حذف التقرير' });
            fetchReports();
        } else {
            toast({ title: 'فشل الحذف', description: result.error, variant: 'destructive' });
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>أرشيف تقارير الرحلات</CardTitle>
                        <CardDescription>عرض وتحليل جميع تقارير الرحلات التي تم رفعها للنظام.</CardDescription>
                    </div>
                    <FlightDataExtractorDialog onSaveSuccess={fetchReports}>
                        <Button><PlusCircle className="me-2 h-4 w-4"/> إضافة تقرير رحلة جديدة</Button>
                    </FlightDataExtractorDialog>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>اسم الملف</TableHead>
                                    <TableHead>تاريخ الرحلة</TableHead>
                                    <TableHead>الوجهة</TableHead>
                                    <TableHead>عدد الركاب</TableHead>
                                    <TableHead>الإيراد الكلي</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">جاري التحميل...</TableCell></TableRow>
                                ) : reports.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">لا توجد تقارير لعرضها.</TableCell></TableRow>
                                ) : reports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-semibold">{report.fileName}</TableCell>
                                        <TableCell>{format(new Date(report.flightDate), 'yyyy-MM-dd')}</TableCell>
                                        <TableCell>{report.route}</TableCell>
                                        <TableCell>{report.paxCount}</TableCell>
                                        <TableCell className="font-mono">{report.totalRevenue.toFixed(2)} USD</TableCell>
                                        <TableCell>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                   <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا التقرير بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(report.id)}>نعم، قم بالحذف</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
