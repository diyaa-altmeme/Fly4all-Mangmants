
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { saveFlightReport } from '../../flight-analysis/actions';
import type { ExtractedPassenger, FlightReport } from '@/lib/types';
import { Route as RouteIcon, Calendar, Clock, Users, DollarSign, ArrowRight, Repeat } from 'lucide-react';

export default function FlightAuditContent({ initialData }: { initialData: any }) {
    const [filter, setFilter] = useState("");
    const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // This is a placeholder for the actual audit logic and data transformation
    const processedData = useMemo(() => {
        // The data is already in the format we want from the extraction dialog
        return (initialData.passengers || []).map((p: ExtractedPassenger, index: number) => ({
            ...p,
            id: `${p.bookingReference}-${p.name}-${index}`, // create a unique key
            alerts: '✅ لا يوجد', // Placeholder for future validation logic
        }));
    }, [initialData]);

    const filteredData = processedData.filter((row: ExtractedPassenger & { alerts: string }) =>
        (row.name.toLowerCase().includes(filter.toLowerCase()) || (row.pnrClass || '').toLowerCase().includes(filter.toLowerCase()))
    ).filter((row: any) =>
        showOnlyAlerts ? row.alerts !== "✅ لا يوجد" : true
    );
    
    const handleSave = async () => {
        setIsSaving(true);
        const reportToSave: Omit<FlightReport, 'id'> = {
          fileName: initialData.fileName,
          flightDate: initialData.flightInfo.date,
          flightTime: initialData.flightInfo.time,
          route: initialData.flightInfo.route,
          supplierName: initialData.flightInfo.supplierName,
          paxCount: initialData.paxCount,
          totalRevenue: initialData.totalRevenue,
          filteredRevenue: 0,
          totalDiscount: 0,
          passengers: initialData.passengers,
          payDistribution: initialData.payDistribution,
          tripTypeCounts: initialData.tripTypeCounts,
          pnrGroups: initialData.pnrGroups,
          issues: { tripAnalysis: [], duplicatePnr: [], fileAnalysis: [], dataIntegrity: [] }
      };

      const result = await saveFlightReport(reportToSave);
      if (result.success) {
          toast({ title: "تم حفظ التقرير بنجاح" });
          // Optionally clear the data and redirect
      } else {
          toast({ title: "خطأ", description: result.error, variant: 'destructive' });
      }

      setIsSaving(false);
    };

    return (
        <div className="p-4 space-y-4">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <h4 className="font-bold mb-2">ملخص الرحلة</h4>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><RouteIcon className="h-4 w-4 text-primary"/>الوجهة</TableCell><TableCell>{initialData.flightInfo?.route}</TableCell></TableRow>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/>تاريخ الرحلة</TableCell><TableCell>{initialData.flightInfo?.date}</TableCell></TableRow>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/>وقت الرحلة</TableCell><TableCell>{initialData.flightInfo?.time}</TableCell></TableRow>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary"/>عدد المسافرين الفعلي</TableCell><TableCell>{initialData.paxCount}</TableCell></TableRow>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary"/>الإيراد الكلي</TableCell><TableCell className="font-mono">{initialData.totalRevenue?.toFixed(2) ?? '0.00'} USD</TableCell></TableRow>
                        </TableBody>
                    </Table>
                     <h4 className="font-bold mb-2 mt-4">ملخص نوع الرحلة</h4>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500"/>ذهاب فقط</TableCell><TableCell className="font-bold">{initialData.tripTypeCounts?.oneWay ?? 0}</TableCell></TableRow>
                            <TableRow><TableCell className="font-bold flex items-center gap-2"><Repeat className="h-4 w-4 text-green-500"/>ذهاب وعودة</TableCell><TableCell className="font-bold">{initialData.tripTypeCounts?.roundTrip ?? 0}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold mb-2">ملخص الأسعار</h4>
                         <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <Table>
                                <TableHeader><TableRow><TableHead>السعر</TableHead><TableHead>العدد</TableHead><TableHead className="text-right">الإجمالي</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(initialData.payDistribution || []).map((p: any) => (
                                        <TableRow key={p.amount}>
                                            <TableCell>{p.amount} USD</TableCell>
                                            <TableCell>{p.count}</TableCell>
                                            <TableCell className="font-mono text-right">{p.subtotal?.toFixed(2) ?? '0.00'} USD</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter><TableRow><TableCell className="font-bold">المجموع</TableCell><TableCell className="font-bold font-mono">{initialData.paxCount}</TableCell><TableCell className="font-bold font-mono text-right">{initialData.totalRevenue?.toFixed(2) ?? '0.00'} USD</TableCell></TableRow></TableFooter>
                            </Table>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-2">توزيع الحجوزات</h4>
                         <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <Table>
                                <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>الركاب</TableHead><TableHead className="text-right">الإجمالي</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(initialData.pnrGroups || []).map((p: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono">{p.pnr || p.bookingReference}</TableCell>
                                            <TableCell>{p.paxCount}</TableCell>
                                            <TableCell className="font-mono text-right">{p.totalPayable.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                 </div>
            </div>
            <div className="flex gap-4">
                <Input placeholder="ابحث بالاسم أو PNR" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <Button onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}>
                    {showOnlyAlerts ? "عرض الكل" : "عرض التنبيهات فقط"}
                </Button>
            </div>
            
            <div className="border rounded-lg overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Booking Reference</TableHead>
                            <TableHead>PNR / Class</TableHead>
                            <TableHead>الاسم الكامل</TableHead>
                            <TableHead>الجنس</TableHead>
                            <TableHead>الوجهة</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الوقت</TableHead>
                            <TableHead className="text-right">Payable</TableHead>
                            <TableHead>التنبيهات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((row: any) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.bookingReference}</TableCell>
                                <TableCell>{row.pnrClass}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.gender}</TableCell>
                                <TableCell>{row.route}</TableCell>
                                <TableCell>{row.flightDate}</TableCell>
                                <TableCell>{row.flightTime}</TableCell>
                                <TableCell className="text-right font-mono">{row.payable?.toFixed(2)}</TableCell>
                                <TableCell>{row.alerts}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "جاري الحفظ..." : "تأكيد وحفظ البيانات النهائية"}
                </Button>
            </div>
        </div>
    );
}
