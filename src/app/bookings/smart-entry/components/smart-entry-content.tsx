
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Client, Supplier, Box, BookingEntry, Currency, TicketType } from '@/lib/types';
import { Loader2, UploadCloud, Trash2, Save, Plane, Calendar, Users, Fingerprint, Ticket, BadgeCent, Banknote, FileText, ChevronDown, Sheet, Settings, MoreVertical, Route, Building, Briefcase, Calculator, PlusCircle, Wand2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { addMultipleBookings } from '@/app/bookings/actions';
import { extractTicketData, type ExtractTicketDataOutput } from '@/ai/flows/extract-ticket-data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { produce } from 'immer';
import Image from 'next/image';
import Link from 'next/link';
import { NumericInput } from '@/components/ui/numeric-input';


interface SmartEntryContentProps {
  clients: Client[];
  suppliers: Supplier[];
  boxes: Box[];
}

type ProcessedTicket = ExtractTicketDataOutput & {
  id: string; // Unique ID for the batch item
  financialData: {
    supplierId: string;
    clientId: string;
    boxId: string;
    currency: Currency;
  };
  passengers: (ExtractTicketDataOutput['passengers'][0] & {
      purchasePrice: number,
      salePrice: number,
      currency: Currency
  })[],
  file: File;
};

type UnifiedFinancialData = {
    supplierId: string;
    clientId: string;
    boxId: string;
    currency: Currency;
}


export default function SmartEntryContent({ clients, suppliers, boxes }: SmartEntryContentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedTickets, setProcessedTickets] = useState<ProcessedTicket[]>([]);
  const [processedFileNames, setProcessedFileNames] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const [unifiedData, setUnifiedData] = useState<UnifiedFinancialData>({
      supplierId: '', clientId: '', boxId: '', currency: 'USD'
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(file => !processedFileNames.has(file.name));
    if (newFiles.length === 0) {
        toast({ title: "لا توجد ملفات جديدة", description: "تم بالفعل معالجة جميع الملفات المحددة." });
        return;
    }

    setIsProcessing(true);
    setProgress(0);

    const totalFiles = newFiles.length;
    let processedCount = 0;

    const processFile = (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const fileDataUri = reader.result as string;
                const result = await extractTicketData({ fileDataUri });

                setProcessedTickets(prev => [
                    ...prev,
                    {
                        ...result,
                        id: `ticket-${Date.now()}-${Math.random()}`,
                        financialData: { 
                            supplierId: unifiedData.supplierId || '', 
                            clientId: unifiedData.clientId || '', 
                            boxId: unifiedData.boxId || '', 
                            currency: unifiedData.currency || 'USD' 
                        },
                        passengers: result.passengers.map(p => ({ ...p, purchasePrice: 0, salePrice: 0, passportNumber: p.passportNumber || '', currency: unifiedData.currency || 'USD' })),
                        file: file,
                    }
                ]);
                setProcessedFileNames(prev => new Set(prev).add(file.name));
                resolve();
            } catch (error: any) {
                console.error(`Error processing file ${file.name}:`, error);
                toast({ title: `خطأ في تحليل ملف: ${file.name}`, description: error.message || "لم يتمكن الذكاء الاصطناعي من قراءة هذا الملف.", variant: "destructive" });
                reject(error);
            } finally {
                processedCount++;
                setProgress((processedCount / totalFiles) * 100);
            }
        };
        reader.onerror = (error) => {
            toast({ title: `خطأ في قراءة ملف: ${file.name}`, variant: "destructive" });
            processedCount++;
            setProgress((processedCount / totalFiles) * 100);
            reject(error);
        };
      });
    };
    
    for (const file of newFiles) {
        await processFile(file);
    }

    setIsProcessing(false);
    toast({ title: "اكتمل التحليل", description: `تمت معالجة ${totalFiles} تذكرة.` });
    
  }, [toast, processedFileNames, unifiedData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: isProcessing,
  });
  
  const handlePassengerChange = (ticketId: string, passengerIndex: number, field: 'purchasePrice' | 'salePrice' | 'currency' | 'ticketType', value: number | string) => {
      setProcessedTickets(produce(draft => {
        const ticket = draft.find(t => t.id === ticketId);
        if(ticket) {
            if (field === 'currency') {
                 ticket.passengers[passengerIndex].currency = value as Currency;
            } else if (field === 'ticketType') {
                ticket.passengers[passengerIndex].ticketType = value as TicketType;
            } else {
                ticket.passengers[passengerIndex][field as 'purchasePrice' | 'salePrice'] = value as number;
            }
        }
      }));
  }

  const handleApplyUnifiedData = () => {
    if(!unifiedData.supplierId && !unifiedData.clientId && !unifiedData.boxId) {
        toast({ title: "لا توجد بيانات للتطبيق", description: "الرجاء اختيار مورد أو عميل أو صندوق أولاً.", variant: "destructive" });
        return;
    }
    setProcessedTickets(prev => prev.map(ticket => {
        const newFinancialData = {
            supplierId: unifiedData.supplierId || ticket.financialData.supplierId,
            clientId: unifiedData.clientId || ticket.financialData.clientId,
            boxId: unifiedData.boxId || ticket.financialData.boxId,
            currency: unifiedData.currency || ticket.financialData.currency,
        };
        return {
            ...ticket,
            financialData: newFinancialData,
            passengers: ticket.passengers.map(p => ({ ...p, currency: newFinancialData.currency }))
        }
    }));
    toast({ title: "تم تطبيق البيانات الموحدة", description: `تم تحديث ${processedTickets.length} تذكرة.`});
  };
  
  const handleRemoveTicket = (batchId: string) => {
    const ticketToRemove = processedTickets.find(t => t.id === batchId);
    if(ticketToRemove) {
       setProcessedFileNames(prev => {
            const newSet = new Set(prev);
            newSet.delete(ticketToRemove.file.name);
            return newSet;
       });
       setProcessedTickets(prev => prev.filter(t => t.id !== batchId));
    }
  }

  const handleSaveAll = async () => {
     if (processedTickets.length === 0) {
        toast({ title: "لا توجد حجوزات للحفظ", variant: "destructive" });
        return;
    }
    for (const ticket of processedTickets) {
        if (!ticket.financialData.supplierId || !ticket.financialData.clientId || !ticket.financialData.boxId) {
            toast({ title: "بيانات غير مكتملة", description: `الرجاء تعبئة بيانات المورد والعميل والصندوق للحجز ${ticket.pnr}`, variant: "destructive" });
            return;
        }
    }

    setIsSaving(true);
    const bookingsToSave: Omit<BookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited'>[] = processedTickets.map(ticket => ({
        pnr: ticket.pnr,
        route: ticket.route,
        issueDate: ticket.issueDate,
        travelDate: ticket.travelDate,
        supplierId: ticket.financialData.supplierId,
        clientId: ticket.financialData.clientId,
        boxId: ticket.financialData.boxId,
        notes: `تمت الإضافة عبر الإدخال الذكي من ملف: ${ticket.file.name}`,
        passengers: ticket.passengers.map(p => ({
            ...p,
            id: `temp-${Math.random()}`,
            clientStatement: '',
            currency: p.currency,
        }))
    }));
    
    const result = await addMultipleBookings(bookingsToSave);

    if (result.success && result.count > 0) {
        toast({ title: "تم حفظ الحجوزات بنجاح", description: `تم حفظ ${result.count} حجز جديد.`});
        setProcessedTickets([]);
        setProcessedFileNames(new Set());
    } else {
         toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }

    setIsSaving(false);
  }

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));
  
  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/bookings">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">أداة الإدخال الذكي للتذاكر</h1>
                    <p className="text-muted-foreground">ارفع ملفات PDF، راجع البيانات، واحفظ كل شيء دفعة واحدة.</p>
                </div>
            </div>
            <Button size="lg" disabled={isSaving || isProcessing || processedTickets.length === 0} onClick={handleSaveAll} className="w-full sm:w-auto font-bold bg-accent text-accent-foreground hover:bg-accent/90">
                {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4" />}
                حفظ كل الحجوزات المعلقة ({processedTickets.length})
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 items-start">
             <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة انتظار الحجوزات</CardTitle>
                        <CardDescription>هذه هي قائمة التذاكر التي تم تحليلها وجاهزة للمراجعة والحفظ.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {processedTickets.length === 0 && !isProcessing && (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                                <div className="text-center">
                                    <Calculator className="mx-auto h-24 w-24" />
                                    <p className="mt-4 text-lg font-bold">لم يتم رفع أي ملفات بعد</p>
                                    <p className="text-sm">ابدأ برفع ملفات التذاكر من اللوحة الجانبية.</p>
                                </div>
                            </div>
                        )}
                        {isProcessing && (
                            <div className="space-y-2">
                                <p className="text-sm text-center font-bold text-muted-foreground mb-1">جاري التحليل... ({Math.round(progress)}%)</p>
                                <Progress value={progress} className="h-2 rounded-full" />
                            </div>
                        )}
                        <div className="space-y-4">
                            {processedTickets.map((ticket) => {
                                const supplierName = suppliers.find(s => s.id === (ticket.financialData.supplierId || unifiedData.supplierId))?.name || 'غير محدد';
                                const clientName = clients.find(c => c.id === (ticket.financialData.clientId || unifiedData.clientId))?.name || 'غير محدد';
                                const boxName = boxes.find(b => b.id === (ticket.financialData.boxId || unifiedData.boxId))?.name || 'غير محدد';
                                return (
                                    <Card key={ticket.id} className="relative group shadow-sm hover:shadow-md transition-shadow">
                                        <CardHeader className="p-3 bg-muted/30">
                                            <div className="grid grid-cols-[auto,1fr,auto] gap-x-3 items-center">
                                                {ticket.airlineLogoUrl ? (
                                                    <Image src={ticket.airlineLogoUrl} alt={ticket.airline} width={32} height={32} className="size-8 shrink-0 object-contain" />
                                                ) : (
                                                    <div className="flex items-center justify-center size-8 bg-muted rounded-md shrink-0">
                                                        <Plane className="size-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <CardTitle className="font-mono text-base flex items-center gap-3">
                                                        <span className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-sm font-bold">{ticket.pnr}</span>
                                                        <span className="font-bold">{ticket.airline}</span>
                                                    </CardTitle>
                                                    <CardDescription className="flex items-center gap-x-4 mt-2 text-xs font-bold">
                                                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/>تاريخ الإصدار: {ticket.issueDate}</span>
                                                        <span className="flex items-center gap-1.5"><Plane className="h-3 w-3"/>تاريخ السفر: {ticket.travelDate}</span>
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-1 justify-self-end">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveTicket(ticket.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="font-bold">المسافر</TableHead>
                                                            <TableHead className="font-bold">الشراء</TableHead>
                                                            <TableHead className="font-bold">البيع</TableHead>
                                                            <TableHead className="font-bold w-[90px]">العملة</TableHead>
                                                            <TableHead className="font-bold w-[120px]">نوع التذكرة</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {ticket.passengers.map((p, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <p className="font-bold truncate">{p.name}</p>
                                                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-x-3">
                                                                        <span className="flex items-center gap-1"><Ticket className="h-3 w-3"/>{p.ticketNumber || '-'}</span>
                                                                        <span className="flex items-center gap-1"><Fingerprint className="h-3 w-3"/>{p.passportNumber || '-'}</span>
                                                                        <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{p.passengerType || 'Adult'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell><NumericInput value={p.purchasePrice} onValueChange={(v) => handlePassengerChange(ticket.id, index, 'purchasePrice', v || 0)} className="w-full h-8 font-bold" placeholder="شراء" /></TableCell>
                                                                <TableCell><NumericInput value={p.salePrice} onValueChange={(v) => handlePassengerChange(ticket.id, index, 'salePrice', v || 0)} className="w-full h-8 font-bold" placeholder="بيع"/></TableCell>
                                                                <TableCell>
                                                                    <Select value={p.currency} onValueChange={(v) => handlePassengerChange(ticket.id, index, 'currency', v)}>
                                                                        <SelectTrigger className="h-8 text-xs px-2 font-bold"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="USD" className="font-bold">USD</SelectItem>
                                                                            <SelectItem value="IQD" className="font-bold">IQD</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select value={p.ticketType} onValueChange={(v) => handlePassengerChange(ticket.id, index, 'ticketType', v)}>
                                                                        <SelectTrigger className="h-8 text-xs px-2 font-bold"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="Issue" className="font-bold">إصدار</SelectItem>
                                                                            <SelectItem value="Change" className="font-bold">تغيير</SelectItem>
                                                                            <SelectItem value="Refund" className="font-bold">استرجاع</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )})}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>البيانات الموحدة</CardTitle>
                        <CardDescription>هذه البيانات سيتم تطبيقها على جميع التذاكر.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5"><Label>المورد</Label><Autocomplete options={supplierOptions} placeholder="اختر موردًا..." value={unifiedData.supplierId} onValueChange={(v) => setUnifiedData(p => ({...p, supplierId: v}))} /></div>
                        <div className="space-y-1.5"><Label>العميل</Label><Autocomplete options={clientOptions} placeholder="اختر عميلاً..." value={unifiedData.clientId} onValueChange={(v) => setUnifiedData(p => ({...p, clientId: v}))} /></div>
                        <div className="space-y-1.5"><Label>الصندوق</Label><Select value={unifiedData.boxId} onValueChange={(v) => setUnifiedData(p => ({...p, boxId: v}))}><SelectTrigger><SelectValue placeholder="اختر صندوق..." /></SelectTrigger><SelectContent>{boxes.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-1.5"><Label>العملة</Label><Select value={unifiedData.currency} onValueChange={(v) => setUnifiedData(p => ({...p, currency: v as Currency}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select></div>
                        <Button className="w-full font-bold bg-[#5b21b6] hover:bg-[#5b21b6]/90" onClick={handleApplyUnifiedData}>تطبيق على الكل</Button>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>رفع الملفات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div {...getRootProps()} className={cn("flex-shrink-0 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer flex flex-col justify-center items-center hover:border-primary transition-colors", isDragActive && "border-primary bg-primary/10")}>
                            <input {...getInputProps()} />
                            <UploadCloud className="h-10 w-10 text-muted-foreground mb-2"/>
                            <p className="font-bold">ارفع أو اسحب الملفات</p>
                            <p className="text-xs text-muted-foreground">ملفات PDF فقط</p>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    </div>
  );
}
