
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Client, Supplier, Box, BookingEntry, Currency, TicketType, User as CurrentUser, Passenger } from '@/lib/types';
import { Loader2, UploadCloud, Trash2, Save, Plane, Calendar, Users, Fingerprint, Ticket, BadgeCent, Banknote, FileText, ChevronDown, Sheet, Settings, MoreVertical, Route, Building, Briefcase, Calculator, PlusCircle, Wand2, FileSpreadsheet, ArrowLeft, Settings2, RotateCcw, Hash, User, ArrowUp, ArrowDown, UserSquare, Baby, UserRound, Wallet, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { addMultipleBookings } from '@/app/bookings/actions';
import { extractTicketData, type ExtractTicketDataOutput } from '@/ai/flows/extract-ticket-data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { produce } from 'immer';
import Image from 'next/image';
import Link from 'next/link';
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';


interface SmartTicketEntryDialogProps {
  onMultipleBookingsAdded: (newBookings: BookingEntry[]) => void;
  children: React.ReactNode;
}

type ProcessedTicket = ExtractTicketDataOutput & {
  id: string; // Unique ID for the batch item
  financialData: {
    supplierId: string;
    clientId: string;
    currency: Currency;
  };
  passengers: (ExtractTicketDataOutput['passengers'][0] & {
      purchasePrice: number,
      salePrice: number,
  })[],
  file: File;
};

type UnifiedFinancialData = {
    supplierId: string;
    clientId: string;
    currency: Currency;
}

const DIALOG_SETTINGS_KEY = 'smartTicketDialogSettings';

const passengerTypeOptions: { value: Passenger['passengerType'], label: string, icon: React.ElementType }[] = [
    { value: "Adult", label: "بالغ", icon: UserSquare },
    { value: "Child", label: "طفل", icon: UserRound },
    { value: "Infant", label: "رضيع", icon: Baby },
];


export default function SmartTicketEntryDialog({ onMultipleBookingsAdded, children }: SmartTicketEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedTickets, setProcessedTickets] = useState<ProcessedTicket[]>([]);
  const [processedFileNames, setProcessedFileNames] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const { user: currentUser } = useAuth();
  
  const [unifiedData, setUnifiedData] = useState<UnifiedFinancialData>({
      supplierId: '', clientId: '', currency: 'USD'
  });

  const [dialogDimensions, setDialogDimensions] = useState({
    width: '1400px',
    height: '90vh',
  });
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);

   useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(DIALOG_SETTINGS_KEY);
      if (savedSettings) {
        setDialogDimensions(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error("Failed to parse dialog settings from localStorage", e);
    }
  }, []);

  const handleDimensionsSave = () => {
    try {
      localStorage.setItem(DIALOG_SETTINGS_KEY, JSON.stringify(dialogDimensions));
      toast({ title: 'تم حفظ أبعاد النافذة' });
      setIsSettingsPopoverOpen(false);
    } catch (e) {
      toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات', variant: 'destructive' });
    }
  };

  const handleDimensionsReset = () => {
     const defaultDims = { width: '1400px', height: '90vh' };
     setDialogDimensions(defaultDims);
     localStorage.setItem(DIALOG_SETTINGS_KEY, JSON.stringify(defaultDims));
     toast({ title: 'تمت إعادة تعيين الأبعاد' });
  }

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
                            currency: unifiedData.currency || 'USD',
                        },
                        passengers: result.passengers.map(p => ({ ...p, purchasePrice: 0, salePrice: 0, passportNumber: p.passportNumber || '', ticketType: 'Issue' })),
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
  
  const handlePassengerChange = (ticketId: string, passengerIndex: number, field: 'purchasePrice' | 'salePrice' | 'passengerType' | 'passportNumber' | 'name' | 'ticketNumber', value: number | string) => {
      setProcessedTickets(produce(draft => {
        const ticket = draft.find(t => t.id === ticketId);
        if(ticket) {
            (ticket.passengers[passengerIndex] as any)[field] = value;
        }
      }));
  }

  const handleFinancialDataChange = (ticketId: string, field: keyof ProcessedTicket['financialData'], value: string) => {
      setProcessedTickets(produce(draft => {
        const ticket = draft.find(t => t.id === ticketId);
        if(ticket) {
            (ticket.financialData as any)[field] = value;
        }
      }));
  };

  const handleApplyUnifiedData = () => {
    if(!unifiedData.supplierId && !unifiedData.clientId) {
        toast({ title: "لا توجد بيانات للتطبيق", description: "الرجاء اختيار مورد وعميل.", variant: "destructive" });
        return;
    }
    setProcessedTickets(prev => prev.map(ticket => {
        const newFinancialData = {
            supplierId: unifiedData.supplierId || ticket.financialData.supplierId,
            clientId: unifiedData.clientId || ticket.financialData.clientId,
            currency: unifiedData.currency || ticket.financialData.currency,
        };
        return {
            ...ticket,
            financialData: newFinancialData,
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
    if (!currentUser || !('boxId' in currentUser) || !currentUser.boxId) {
        toast({ title: "صندوق غير محدد", description: `لا يوجد صندوق مرتبط بحسابك. يرجى مراجعة المدير.`, variant: "destructive" });
        return;
    }
    for (const ticket of processedTickets) {
        if (!ticket.financialData.supplierId || !ticket.financialData.clientId) {
            toast({ title: "بيانات غير مكتملة", description: `الرجاء تعبئة بيانات المورد والعميل للحجز ${ticket.pnr}.`, variant: "destructive" });
            return;
        }
    }

    setIsSaving(true);
    setOpen(false); // Close dialog immediately
    
    const bookingsToSave: Omit<BookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>[] = processedTickets.map(ticket => ({
        pnr: ticket.pnr,
        route: ticket.route,
        issueDate: ticket.issueDate,
        travelDate: ticket.travelDate,
        supplierId: ticket.financialData.supplierId,
        clientId: ticket.financialData.clientId,
        boxId: currentUser.boxId || '',
        notes: `تمت الإضافة عبر الإدخال الذكي من ملف: ${ticket.file.name}`,
        currency: ticket.financialData.currency,
        passengers: ticket.passengers.map(p => ({
            ...p,
            id: `temp-${Math.random()}`,
            clientStatement: '',
            ticketType: p.ticketType || 'Issue', 
        } as Passenger))
    }));
    
    const result = await addMultipleBookings(bookingsToSave);

    if (result.success && result.newBookings) {
        toast({ title: "تم حفظ الحجوزات بنجاح", description: `تم حفظ ${result.count} حجز جديد.`});
        onMultipleBookingsAdded(result.newBookings);
        setProcessedTickets([]);
        setProcessedFileNames(new Set());
    } else {
         toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }

    setIsSaving(false);
  }
  
  const getNumericValue = (value: string) => parseInt(value.replace(/px|vw|vh/g, ''), 10) || 0;

  const supplierOptions = (navData?.suppliers || []).map(s => ({ value: s.id, label: s.name }));
  const clientOptions = (navData?.clients || []).map(c => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          {children}
      </DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="p-0 flex flex-col"
        style={{ 
          maxWidth: dialogDimensions.width, 
          width: '95vw',
          height: dialogDimensions.height,
          resize: 'both',
          overflow: 'auto'
        }}
      >
        <DialogHeader className="bg-primary text-primary-foreground p-3 rounded-t-lg flex flex-row items-center justify-between sticky top-0 z-10 border-b">
           <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 h-7 w-7 rounded-full">
                <X className="h-4 w-4"/>
              </Button>
           </DialogClose>
          <div className="text-right">
            <DialogTitle className="flex items-center gap-2"><Wand2/>أداة الإدخال الذكي للتذاكر</DialogTitle>
          </div>
           <Popover open={isSettingsPopoverOpen} onOpenChange={setIsSettingsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                <Settings2 className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium leading-none">أبعاد النافذة</h4>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                                      <RotateCcw className="me-1 h-3 w-3"/> إعادة للوضع الافتراضي
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                        <AlertDialogDescription>سيتم إعادة أبعاد النافذة إلى الحجم الافتراضي.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDimensionsReset} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالإعادة</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            تحكم في حجم النافذة لتناسب شاشتك.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="width">العرض (px)</Label>
                            <NumericInput id="width" value={getNumericValue(dialogDimensions.width)} onValueChange={(v) => setDialogDimensions(d => ({...d, width: `${v || 0}px`}))} className="col-span-2 h-8" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="height">الارتفاع (vh)</Label>
                             <NumericInput id="height" value={getNumericValue(dialogDimensions.height)} onValueChange={(v) => setDialogDimensions(d => ({...d, height: `${v || 0}vh`}))} className="col-span-2 h-8" />
                        </div>
                        <Button onClick={handleDimensionsSave} size="sm" className="mt-2">حفظ الأبعاد</Button>
                    </div>
                </div>
            </PopoverContent>
          </Popover>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
            {!isDataLoaded || !navData ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
            <>
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end px-4 py-3 border rounded-lg bg-muted/30">
                <div className="space-y-1.5"><Label className="font-bold">المورد</Label><Autocomplete options={supplierOptions} placeholder="المورد الافتراضي..." value={unifiedData.supplierId} onValueChange={(v) => setUnifiedData(p => ({...p, supplierId: v}))} /></div>
                <div className="space-y-1.5"><Label className="font-bold">العميل</Label><Autocomplete options={clientOptions} placeholder="العميل الافتراضي..." value={unifiedData.clientId} onValueChange={(v) => setUnifiedData(p => ({...p, clientId: v}))} /></div>
                 <div className="space-y-1.5"><Label className="font-bold">العملة</Label><Select value={unifiedData.currency} onValueChange={(v) => setUnifiedData(p => ({...p, currency: v as Currency}))}><SelectTrigger className="font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem className="font-bold" value="USD">USD</SelectItem><SelectItem className="font-bold" value="IQD">IQD</SelectItem></SelectContent></Select></div>
                <div className="flex items-center gap-2">
                    <Button className="w-full font-bold bg-[#5b21b6] hover:bg-[#5b21b6]/90" onClick={handleApplyUnifiedData}>تطبيق على الكل</Button>
                    <div {...getRootProps()} className="cursor-pointer">
                        <input {...getInputProps()} />
                        <Button variant="outline" size="icon" disabled={isProcessing}>
                            <UploadCloud className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-hidden">
                 <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="space-y-4 min-h-full">
                        {processedTickets.length === 0 && !isProcessing && (
                            <div className="flex items-center justify-center h-full text-muted-foreground pt-10">
                                <div className="text-center">
                                    <Calculator className="mx-auto h-24 w-24" />
                                    <p className="mt-4 text-lg font-bold">قائمة انتظار الحجوزات</p>
                                    <p className="text-sm">ابدأ برفع ملفات التذاكر من الأيقونة في الأعلى.</p>
                                </div>
                            </div>
                        )}
                        {isProcessing && (
                            <div className="space-y-2">
                                <p className="text-sm text-center font-bold text-muted-foreground mb-1">جاري التحليل... ({Math.round(progress)}%)</p>
                                <Progress value={progress} className="h-2 rounded-full" />
                            </div>
                        )}
                        {processedTickets.map((ticket) => (
                           <Card key={ticket.id} className="relative group shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="p-3 bg-muted/30">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-3">
                                            {ticket.airlineLogoUrl ? ( <Image src={ticket.airlineLogoUrl} alt={ticket.airline} width={32} height={32} className="size-8 shrink-0 object-contain" /> ) : ( <div className="flex items-center justify-center size-8 bg-background rounded-md shrink-0"><Plane className="size-5 text-muted-foreground" /></div> )}
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-mono text-base">{ticket.pnr}</Badge>
                                                <span className="font-bold">{ticket.airline}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-x-4 text-xs font-bold text-muted-foreground">
                                            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/>إصدار: {ticket.issueDate}</span>
                                            <span className="flex items-center gap-1.5"><Plane className="h-3 w-3"/>سفر: {ticket.travelDate}</span>
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveTicket(ticket.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table dir="rtl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-bold text-right">المسافر</TableHead>
                                                <TableHead className="font-bold text-right">رقم الجواز</TableHead>
                                                <TableHead className="font-bold text-right">رقم التذكرة</TableHead>
                                                <TableHead className="font-bold text-right">شراء</TableHead>
                                                <TableHead className="font-bold text-right">بيع</TableHead>
                                                <TableHead className="font-bold text-right">الربح</TableHead>
                                                <TableHead className="font-bold text-right">نوع المسافر</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {ticket.passengers.map((p, passengerIndex) => {
                                            const profit = (p.salePrice || 0) - (p.purchasePrice || 0);
                                            return (
                                                <TableRow key={`${ticket.id}-${passengerIndex}`}>
                                                    <TableCell className="p-2">
                                                        <Input value={p.name} onChange={(e) => handlePassengerChange(ticket.id, passengerIndex, 'name', e.target.value)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input value={p.passportNumber} onChange={(e) => handlePassengerChange(ticket.id, passengerIndex, 'passportNumber', e.target.value)} className="h-8" />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input value={p.ticketNumber} onChange={(e) => handlePassengerChange(ticket.id, passengerIndex, 'ticketNumber', e.target.value)} className="h-8" />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <NumericInput currency={ticket.financialData.currency} currencyClassName={cn(ticket.financialData.currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} value={p.purchasePrice} onValueChange={(v) => handlePassengerChange(ticket.id, passengerIndex, 'purchasePrice', v || 0)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <NumericInput currency={ticket.financialData.currency} currencyClassName={cn(ticket.financialData.currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} value={p.salePrice} onValueChange={(v) => handlePassengerChange(ticket.id, passengerIndex, 'salePrice', v || 0)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <div className={cn("font-mono text-center font-bold", profit >= 0 ? "text-green-600" : "text-destructive")}>{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Select value={p.passengerType} onValueChange={(v) => handlePassengerChange(ticket.id, passengerIndex, 'passengerType', v)}>
                                                            <SelectTrigger className="h-8 text-xs px-2 font-bold justify-end gap-2">
                                                                <SelectValue/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {passengerTypeOptions.map(option => {
                                                                const Icon = option.icon;
                                                                return (
                                                                    <SelectItem key={option.value} value={option.value} className="font-bold justify-end">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <span>{option.label}</span>
                                                                            <Icon className="h-4 w-4"/>
                                                                        </div>
                                                                    </SelectItem>
                                                                )
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                 <CardFooter className="p-3 bg-muted/30 border-t">
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                        <Autocomplete options={supplierOptions} placeholder="المورد..." value={ticket.financialData.supplierId} onValueChange={(v) => handleFinancialDataChange(ticket.id, 'supplierId', v)} />
                                        <Autocomplete options={clientOptions} placeholder="العميل..." value={ticket.financialData.clientId} onValueChange={(v) => handleFinancialDataChange(ticket.id, 'clientId', v)} />
                                        <Select value={ticket.financialData.currency} onValueChange={(v) => handleFinancialDataChange(ticket.id, 'currency', v)}>
                                            <SelectTrigger className="h-9 text-xs px-2 font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD" className="font-bold">USD</SelectItem>
                                                <SelectItem value="IQD" className="font-bold">IQD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            </>
            )}
        </div>
        <DialogFooter className="border-t p-2 bg-background shrink-0 flex-row items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-primary"/> <span>المستخدم: {currentUser?.name || '...'}</span></div>
                 {currentUser?.boxId && (
                     <div className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary"/> <span>الصندوق: {navData?.boxes?.find(b => b.id === currentUser.boxId)?.name || 'غير محدد'}</span></div>
                 )}
            </div>
            <div className="flex-1 flex justify-end">
                {processedTickets.length > 0 && (
                    <Button size="lg" disabled={isSaving || isProcessing} onClick={handleSaveAll} className="w-full sm:w-auto font-bold bg-accent text-accent-foreground hover:bg-accent/90">
                        {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4" />}
                        حفظ كل الحجوزات المعلقة ({processedTickets.length})
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
