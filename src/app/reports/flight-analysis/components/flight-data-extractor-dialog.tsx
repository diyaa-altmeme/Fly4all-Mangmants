
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Upload, FileText, AlertTriangle, Wand2, Download, Loader2, Save, X, PlusCircle, Route as RouteIcon, Calendar as CalendarIcon, Clock, Users, DollarSign, ChevronDown, Plane, User, ArrowRight, Repeat, Building, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { saveFlightReport } from '@/app/reports/flight-analysis/actions';
import { Badge } from '@/components/ui/badge';
import type { ExtractedPassenger, FlightReport, PnrGroup } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDropzone } from 'react-dropzone';

const PnrRow = ({ pnrGroup }: { pnrGroup: PnrGroup }) => {
  return (
    <Collapsible asChild key={pnrGroup.bookingReference}>
      <TableBody>
        <TableRow className="font-bold text-center">
            <TableCell>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 data-[state=open]:rotate-180"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </CollapsibleTrigger>
            </TableCell>
            <TableCell className="font-mono text-sm">
                {pnrGroup.bookingReference}
            </TableCell>
            <TableCell className="font-mono text-sm">{pnrGroup.pnr}</TableCell>
            <TableCell className="font-semibold">{pnrGroup.paxCount}</TableCell>
            <TableCell className="font-mono text-sm">
                {pnrGroup.totalPayable.toFixed(2)}
            </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
            <TableRow>
                <TableCell colSpan={5} className="p-0">
                    <div className="p-2 bg-muted/50">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking Reference</TableHead>
                                    <TableHead>PNR / Class</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>Passport Number</TableHead>
                                    <TableHead>Passenger Type</TableHead>
                                    <TableHead className="text-right">Payable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pnrGroup.passengers.map((p, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{p.bookingReference}</TableCell>
                                        <TableCell>{p.pnrClass}</TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.gender}</TableCell>
                                        <TableCell>{p.passportNumber}</TableCell>
                                        <TableCell>{p.passengerType}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {p.payable.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TableCell>
            </TableRow>
        </CollapsibleContent>
      </TableBody>
    </Collapsible>
  );
};

interface FlightDataExtractorDialogProps {
    onSaveSuccess: () => void;
    children: React.ReactNode;
}

interface ExtractedReport {
    id: string;
    pnrGroups: PnrGroup[];
    allPassengersForDetails: ExtractedPassenger[];
    fileName: string;
    flightInfo: { date: string; time: string; route: string; supplierName: string; };
    paxCount: number;
    totalRevenue: number;
    payDistribution: { amount: number; count: number; subtotal: number; }[];
    tripDirection: string;
}

export default function FlightDataExtractorDialog({ onSaveSuccess, children }: FlightDataExtractorDialogProps) {
  const [extractedReports, setExtractedReports] = useState<ExtractedReport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const parseExcelDate = (excelDate: number | string): Date | null => {
    if (typeof excelDate === 'number' && excelDate > 1) {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return !isNaN(date.getTime()) ? date : null;
    }
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate.replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3'));
        if (!isNaN(date.getTime())) return date;
    }
    return null;
  };
  
  const parseDateValue = (value: any): string => {
    if (!value) return '';
    const date = parseExcelDate(value);
    return date ? date.toISOString().split('T')[0] : String(value).split(' ')[0];
  }

  const parseTimeValue = (value: any): string => {
    if (!value) return '';
    const date = parseExcelDate(value);
    if (date) {
        if (typeof value === 'number' && value < 1 && value > 0) { 
             const totalSeconds = Math.round(value * 86400);
             const hours = Math.floor(totalSeconds / 3600);
             const minutes = Math.floor((totalSeconds % 3600) / 60);
             return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        if (date.toTimeString() !== '00:00:00 GMT+0000 (Coordinated Universal Time)') {
             return date.toTimeString().split(' ')[0].substring(0, 5);
        }
    }
    const parts = String(value).split(' ');
    return parts.length > 1 && /^\d{1,2}:\d{2}/.test(parts[1]) ? parts[1].substring(0, 5) : '';
  }
  
  const parsePayableValue = (value: any): number => {
    if (value === undefined || value === null) return 0;
    const stringValue = String(value).replace(/[^0-9.-]+/g, "");
    const numberValue = parseFloat(stringValue);
    return isNaN(numberValue) ? 0 : numberValue;
  }
  
  const getPassengerType = (passengerString: string): ExtractedPassenger['passengerType'] => {
      if (!passengerString) return 'Adult';
      const cleanedString = passengerString.replace(/[-\s]/g, '').toUpperCase();
      if (cleanedString.startsWith('CHD')) {
          return 'Child';
      }
      if (cleanedString.startsWith('INF')) {
          return 'Infant';
      }
      return 'Adult';
  };

  const processFile = useCallback((file: File): Promise<ExtractedReport | null> => {
      return new Promise<ExtractedReport | null>((resolve) => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = (ev) => {
              try {
                  const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  
                  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                  
                  const rawSupplierName = rawData[1] && rawData[1][3] ? String(rawData[1][3]) : '';
                  const supplierName = rawSupplierName.replace(/\s*\(.*\)/, '').trim();
                  const routeInfo = rawData[1] && rawData[1][1] ? String(rawData[1][1]) : '';
                  const departureInfo = rawData[1] && rawData[1][2] ? String(rawData[1][2]) : '';
                  const flightDateInfo = parseDateValue(departureInfo);
                  const flightTimeInfo = parseTimeValue(departureInfo);

                  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 4 });

                  const findHeader = (keywords: string[]) => {
                      const lowerKeywords = keywords.map(k => k.toLowerCase());
                      return Object.keys(jsonData[0] as any).find(key => lowerKeywords.includes(key.toLowerCase().trim()));
                  };
                  
                  const detectedBookingRefCol = findHeader(['booking reference']);
                  const detectedPnrClassCol = findHeader(['pnr / class']);
                  const detectedFullNameCol = findHeader(['passenger full name', 'full name', 'passenger']);
                  const detectedFirstNameCol = findHeader(['first name']);
                  const detectedLastNameCol = findHeader(['last name']);
                  const detectedPayableCol = findHeader(['payable (pp)']);
                  const detectedGenderCol = findHeader(['gender']);
                  const detectedPassportCol = findHeader(['s5', 'passport no.', 'passport number']);

                  let currentBookingRef = '';
                  let currentPnr = '';
                  
                  const allPassengers: ExtractedPassenger[] = jsonData.map((row: any) => {
                      let passengerName = 'N/A';
                      const firstName = detectedFirstNameCol && row[detectedFirstNameCol] ? String(row[detectedFirstNameCol]) : '';
                      const lastName = detectedLastNameCol && row[detectedLastNameCol] ? String(row[detectedLastNameCol]) : '';
                      const fullNameFromPassengerCol = detectedFullNameCol && row[detectedFullNameCol] ? String(row[detectedFullNameCol]) : '';

                      if (firstName && lastName) {
                          passengerName = `${firstName} ${lastName}`.trim();
                      } else if (fullNameFromPassengerCol) {
                          passengerName = fullNameFromPassengerCol;
                      }

                      const bookingRef = (detectedBookingRefCol && row[detectedBookingRefCol]) ? String(row[detectedBookingRefCol]) : currentBookingRef;
                      const pnrClass = (detectedPnrClassCol && row[detectedPnrClassCol]) ? String(row[detectedPnrClassCol]) : currentPnr;
                      
                      if (bookingRef) currentBookingRef = bookingRef;
                      if (pnrClass) currentPnr = pnrClass;

                      return {
                          bookingReference: currentBookingRef,
                          pnrClass: currentPnr,
                          name: passengerName,
                          payable: detectedPayableCol ? parsePayableValue(row[detectedPayableCol] || 0) : 0,
                          route: routeInfo,
                          flightDate: flightDateInfo,
                          flightTime: flightTimeInfo,
                          gender: detectedGenderCol ? String(row[detectedGenderCol] || '') : '',
                          passportNumber: detectedPassportCol ? String(row[detectedPassportCol] || '') : '',
                          passengerType: getPassengerType(fullNameFromPassengerCol),
                          firstName,
                          lastName,
                      };
                  }).filter(row => row.name && row.name.trim() !== '' && row.name !== 'N/A');
                  
                  const pnrGroups: { [key: string]: PnrGroup } = {};
                  allPassengers.forEach(p => {
                      const pnrKey = p.bookingReference || p.pnrClass;
                      if (!pnrKey) return;

                      if (!pnrGroups[pnrKey]) {
                          pnrGroups[pnrKey] = { pnr: p.pnrClass, bookingReference: p.bookingReference, paxCount: 0, totalPayable: 0, passengers: [] };
                      }
                      
                      pnrGroups[pnrKey].passengers.push(p);
                      pnrGroups[pnrKey].paxCount++;
                      pnrGroups[pnrKey].totalPayable += p.payable;
                  });

                  let totalPax = 0;
                  let totalRev = 0;
                  const payDist: { [key: number]: { count: number, subtotal: number } } = {};
                  const IRAQI_AIRPORTS = ['BGW', 'NJF', 'EBL', 'ISU', 'BSR'];
                  let direction = "غير محدد";
                  if (routeInfo) {
                      const parts = routeInfo.split(/ -> |-/).map(s => s.trim().toUpperCase());
                      const from = parts[0];
                      const to = parts[parts.length - 1];
                      if (IRAQI_AIRPORTS.includes(from) && !IRAQI_AIRPORTS.includes(to)) {
                          direction = 'مغادرة من العراق';
                      } else if (!IRAQI_AIRPORTS.includes(from) && IRAQI_AIRPORTS.includes(to)) {
                          direction = 'رحلة عودة إلى العراق';
                      }
                  }

                  Object.values(pnrGroups).forEach(pnrGroup => {
                      pnrGroup.passengers.forEach(pax => {
                          const payable = pax.payable || 0;
                          totalRev += payable;
                          if(!payDist[payable]) {
                              payDist[payable] = { count: 0, subtotal: 0 };
                          }
                          payDist[payable].count++;
                          payDist[payable].subtotal += payable;
                      })
                      totalPax += pnrGroup.paxCount;
                  });
                  
                  const report: ExtractedReport = {
                      id: file.name + Date.now(),
                      pnrGroups: Object.values(pnrGroups),
                      allPassengersForDetails: allPassengers,
                      fileName: file.name,
                      flightInfo: { date: flightDateInfo, time: flightTimeInfo, route: routeInfo, supplierName: supplierName },
                      paxCount: totalPax,
                      totalRevenue: totalRev,
                      payDistribution: Object.entries(payDist).map(([amount, data]) => ({ amount: parseFloat(amount), ...data })),
                      tripDirection: direction,
                  }
                  resolve(report);

              } catch (err: any) { 
                  toast({ title: 'Error Reading File', description: err.message, variant: 'destructive' });
                  resolve(null);
              }
          };
      });
  }, [toast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
      setIsProcessing(true);
      setStatus(`Processing ${acceptedFiles.length} files...`);
      const allReports: ExtractedReport[] = [];
      for (const file of acceptedFiles) {
          const report = await processFile(file);
          if (report) {
              allReports.push(report);
          }
      }
      setExtractedReports(prev => [...prev, ...allReports]);
      setIsProcessing(false);
      setStatus(`${allReports.length} files loaded and analyzed.`);
  }, [processFile, toast]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true
  });
  
  const handleSaveAll = async () => {
    if (extractedReports.length === 0) {
        toast({ title: "لا توجد تقارير للحفظ", variant: "destructive" });
        return;
    }
    for (const report of extractedReports) {
        await handleSave(report, false); // Save each report without closing dialog
    }
    setExtractedReports([]); // Clear after saving all
    onSaveSuccess();
    setOpen(false); // Close dialog after all are saved
  };

  const handleSave = async (report: ExtractedReport, shouldClose = true) => {
      const reportData: Omit<FlightReport, 'id'> = {
          fileName: report.fileName,
          flightDate: report.flightInfo.date,
          flightTime: report.flightInfo.time,
          route: report.flightInfo.route,
          supplierName: report.flightInfo.supplierName,
          paxCount: report.paxCount,
          totalRevenue: report.totalRevenue,
          filteredRevenue: 0,
          totalDiscount: 0,
          passengers: report.allPassengersForDetails,
          payDistribution: report.payDistribution,
          tripTypeCounts: { oneWay: 0, roundTrip: 0 },
          pnrGroups: report.pnrGroups,
          issues: { tripAnalysis: [], duplicatePnr: [], fileAnalysis: [], dataIntegrity: [] }
      };

      const result = await saveFlightReport(reportData);
      if (result.success) {
          toast({ title: 'تم حفظ التقرير بنجاح', description: `يمكنك الآن مراجعة التقرير في صفحة تحليل الرحلات.` });
          setExtractedReports(prev => prev.filter(r => r.id !== report.id));
          onSaveSuccess();
          if (shouldClose) {
              setOpen(false);
          }
      } else {
           toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
      }
  }
  
  const handleExport = (report: ExtractedReport) => {
      const flatData = report.allPassengersForDetails.map(pax => ({
          'Booking Reference': pax.bookingReference,
          'PNR / Class': pax.pnrClass,
          'First Name': pax.firstName,
          'Last Name': pax.lastName,
          'Full Name': pax.name,
          'Gender': pax.gender,
          'Passport Number': pax.passportNumber,
          'Passenger Type': pax.passengerType,
          'Payable': pax.payable,
      }));
      
      const summary = [
          ['المصدر', report.flightInfo.supplierName],
          ['الوجهة', report.flightInfo.route],
          ['التاريخ', report.flightInfo.date],
          ['الوقت', report.flightInfo.time],
          ['عدد المسافرين', report.paxCount],
          ['الإيراد الكلي', report.totalRevenue.toFixed(2)]
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summary);
      const detailsWs = XLSX.utils.json_to_sheet(flatData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summaryWs, "ملخص الرحلة");
      XLSX.utils.book_append_sheet(wb, detailsWs, "تفاصيل المسافرين");
      
      XLSX.writeFile(wb, `${report.fileName}_details.xlsx`);
  };

  const removeReport = (id: string) => {
      setExtractedReports(prev => prev.filter(r => r.id !== id));
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>محلل بيانات الطيران</DialogTitle>
          <DialogDescription>ارفع ملفات Excel الخاصة بالرحلات لتحليل البيانات واستخراج الملخصات بشكل تلقائي.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-4">
             <Card>
                 <CardContent className="pt-6 flex flex-col items-center gap-4">
                    <div {...getRootProps()} className="w-full max-w-lg cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 font-semibold">انقر لرفع ملف أو قم بسحبه هنا</p>
                            <p className="text-sm text-muted-foreground">الملفات المدعومة: .xlsx, .xls (يمكنك رفع أكثر من ملف)</p>
                        </div>
                    </div>
                    <Input {...getInputProps()} id="file-upload-dialog" className="hidden" />
                 </CardContent>
            </Card>

            {isProcessing && <div className="flex justify-center items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> {status}</div>}

            {extractedReports.map((report) => (
                <Card key={report.id}>
                    <CardHeader className="flex flex-row justify-between items-center bg-muted/50 p-3">
                        <div>
                            <CardTitle className="text-base">{report.fileName}</CardTitle>
                            <CardDescription>تم تحليل {report.paxCount} مسافر.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleExport(report)}>
                                <Download className="me-2 h-4 w-4" /> تصدير
                            </Button>
                            <Button size="sm" onClick={() => handleSave(report)}>
                                <Save className="me-2 h-4 w-4" /> حفظ التقرير
                            </Button>
                             <Button variant="destructive" size="sm" onClick={() => removeReport(report.id)}>
                                <Trash2 className="me-2 h-4 w-4" /> إزالة
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                 <h4 className="font-bold mb-2">ملخص الرحلة</h4>
                                <Table>
                                    <TableBody>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><Building className="h-4 w-4 text-primary"/>المصدر</TableCell><TableCell>{report.flightInfo.supplierName}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><RouteIcon className="h-4 w-4 text-primary"/>الوجهة</TableCell><TableCell>{report.flightInfo.route}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary"/>تاريخ الرحلة</TableCell><TableCell>{report.flightInfo.date}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/>وقت الرحلة</TableCell><TableCell>{report.flightInfo.time}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><Plane className="h-4 w-4 text-primary"/>اتجاه الرحلة</TableCell><TableCell className="font-bold">{report.tripDirection}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary"/>عدد المسافرين</TableCell><TableCell>{report.paxCount}</TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary"/>الإيراد الكلي</TableCell><TableCell className="font-mono">{report.totalRevenue.toFixed(2)} USD</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-bold mb-2">ملخص الأسعار</h4>
                                     <div className="max-h-60 overflow-y-auto border rounded-lg">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>السعر</TableHead><TableHead>العدد</TableHead><TableHead className="text-right">الإجمالي</TableHead></TableRow></TableHeader>
                                            <TableBody>{report.payDistribution.map(p => (<TableRow key={p.amount}><TableCell>{p.amount} USD</TableCell><TableCell>{p.count}</TableCell><TableCell className="font-mono text-right">{p.subtotal.toFixed(2)} USD</TableCell></TableRow>))}</TableBody>
                                            <TableFooter><TableRow><TableCell className="font-bold">المجموع</TableCell><TableCell className="font-bold font-mono">{report.paxCount}</TableCell><TableCell className="font-bold font-mono text-right">{report.totalRevenue.toFixed(2)} USD</TableCell></TableRow></TableFooter>
                                        </Table>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2">توزيع الحجوزات</h4>
                                     <div className="max-h-60 overflow-y-auto border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead></TableHead>
                                                    <TableHead>المرجع</TableHead>
                                                    <TableHead>PNR</TableHead>
                                                    <TableHead>الركاب</TableHead>
                                                    <TableHead className="text-right">الإجمالي</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            {report.pnrGroups.map((pnrGroup, i) => (
                                                <PnrRow key={i} pnrGroup={pnrGroup} />
                                            ))}
                                        </Table>
                                    </div>
                                </div>
                             </div>
                              <div className="lg:col-span-2">
                                     <h4 className="font-bold mb-2">تفاصيل المسافرين</h4>
                                     <div className="max-h-80 overflow-y-auto border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Booking Reference</TableHead>
                                                    <TableHead>PNR / Class</TableHead>
                                                    <TableHead>Full Name</TableHead>
                                                    <TableHead>Gender</TableHead>
                                                    <TableHead>Passport Number</TableHead>
                                                    <TableHead>Passenger Type</TableHead>
                                                    <TableHead className="text-right">Payable</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.allPassengersForDetails.map((pax, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{pax.bookingReference}</TableCell>
                                                        <TableCell>{pax.pnrClass}</TableCell>
                                                        <TableCell>{pax.name}</TableCell>
                                                        <TableCell>{pax.gender}</TableCell>
                                                        <TableCell>{pax.passportNumber}</TableCell>
                                                        <TableCell>{pax.passengerType}</TableCell>
                                                        <TableCell className="font-mono text-right">{pax.payable.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </div>
                                </div>
                         </div>
                    </CardContent>
                </Card>
            ))}
        </div>
         <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">إغلاق</Button>
          </DialogClose>
          {extractedReports.length > 0 && (
            <Button onClick={handleSaveAll} disabled={isProcessing}>
                <Save className="me-2 h-4 w-4"/>
                حفظ كل التقارير ({extractedReports.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
