
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Client, Supplier, Box, VisaBookingEntry, Currency, User as CurrentUser, VisaPassenger } from '@/lib/types';
import { Loader2, UploadCloud, Trash2, Save, Plane, Calendar, Users, Fingerprint, Ticket, BadgeCent, Banknote, FileText, ChevronDown, Sheet, Settings, MoreVertical, Route, Building, Briefcase, Calculator, PlusCircle, Wand2, FileSpreadsheet, ArrowLeft, Settings2, RotateCcw, Hash, User, ArrowUp, ArrowDown, UserSquare, Baby, UserRound, Wallet, X, CreditCard } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { addMultipleVisaBookings } from '@/app/visas/actions';
import { extractVisaData, type ExtractVisaDataOutput } from '@/ai/flows/extract-visa-data';
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
import { NumericInput } from '@/components/ui/numeric-input';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';


interface SmartVisaEntryDialogProps {
  onMultipleBookingsAdded: (newBookings: VisaBookingEntry[]) => void;
  children: React.ReactNode;
}

type ProcessedVisa = ExtractVisaDataOutput & {
  id: string; // Unique ID for the batch item
  financialData: {
    supplierId: string;
    clientId: string;
    currency: Currency;
  };
  passengers: (ExtractVisaDataOutput['passengers'][0] & {
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

const DIALOG_SETTINGS_KEY = 'smartVisaDialogSettings';

export default function SmartVisaEntryDialog({ onMultipleBookingsAdded, children }: SmartVisaEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedVisas, setProcessedVisas] = useState<ProcessedVisa[]>([]);
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
    setIsProcessing(true);
    setProgress(0);

    const totalFiles = acceptedFiles.length;
    let processedCount = 0;

    const processFile = (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const fileDataUri = reader.result as string;
                const result = await extractVisaData({ fileDataUri });

                setProcessedVisas(prev => [
                    ...prev,
                    {
                        ...result,
                        id: `visa-${Date.now()}-${Math.random()}`,
                        financialData: { 
                            supplierId: unifiedData.supplierId || '', 
                            clientId: unifiedData.clientId || '', 
                            currency: unifiedData.currency || 'USD',
                        },
                        passengers: result.passengers.map(p => ({ ...p, purchasePrice: 0, salePrice: 0, passportNumber: p.passportNumber || '' })),
                        file: file,
                    }
                ]);
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
    
    for (const file of acceptedFiles) {
        await processFile(file);
    }

    setIsProcessing(false);
    toast({ title: "اكتمل التحليل", description: `تمت معالجة ${totalFiles} طلب فيزا.` });
    
  }, [toast, unifiedData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: isProcessing,
  });
  
  const handlePassengerChange = (visaId: string, passengerIndex: number, field: 'purchasePrice' | 'salePrice' | 'name' | 'passportNumber' | 'visaType' | 'applicationNumber', value: number | string) => {
      setProcessedVisas(produce(draft => {
        const visa = draft.find(v => v.id === visaId);
        if(visa) {
            (visa.passengers[passengerIndex] as any)[field] = value;
        }
      }));
  }

  const handleVisaDataChange = (visaId: string, field: keyof ExtractVisaDataOutput, value: string) => {
      setProcessedVisas(produce(draft => {
        const visa = draft.find(v => v.id === visaId);
        if(visa) {
            (visa as any)[field] = value;
        }
      }));
  };

  const handleApplyUnifiedData = () => {
    if(!unifiedData.supplierId && !unifiedData.clientId) {
        toast({ title: "لا توجد بيانات للتطبيق", description: "الرجاء اختيار مورد وعميل.", variant: "destructive" });
        return;
    }
    setProcessedVisas(prev => prev.map(visa => {
        const newFinancialData = {
            supplierId: unifiedData.supplierId || visa.financialData.supplierId,
            clientId: unifiedData.clientId || visa.financialData.clientId,
            currency: unifiedData.currency || visa.financialData.currency,
        };
        return {
            ...visa,
            financialData: newFinancialData,
        }
    }));
    toast({ title: "تم تطبيق البيانات الموحدة", description: `تم تحديث ${processedVisas.length} طلب.`});
  };
  
  const handleRemoveVisa = (batchId: string) => {
    setProcessedVisas(prev => prev.filter(v => v.id !== batchId));
  }

  const handleSaveAll = async () => {
     if (processedVisas.length === 0) {
        toast({ title: "لا توجد طلبات فيزا للحفظ", variant: "destructive" });
        return;
    }
    if (!currentUser?.boxId) {
        toast({ title: "صندوق غير محدد", description: `لا يوجد صندوق مرتبط بحسابك. يرجى مراجعة المدير.`, variant: "destructive" });
        return;
    }
    for (const visa of processedVisas) {
        if (!visa.financialData.supplierId || !visa.financialData.clientId) {
            toast({ title: "بيانات غير مكتملة", description: `الرجاء تعبئة بيانات المورد والعميل للطلب ${visa.applicationNumber || visa.id}.`, variant: "destructive" });
            return;
        }
    }

    setIsSaving(true);
    setOpen(false); // Close dialog immediately
    
    const bookingsToSave: Omit<VisaBookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited'>[] = processedVisas.map(visa => ({
        submissionDate: new Date().toISOString(),
        supplierId: visa.financialData.supplierId,
        clientId: visa.financialData.clientId,
        boxId: currentUser.boxId || '',
        notes: `تمت الإضافة عبر الإدخال الذكي من ملف: ${visa.file.name}`,
        currency: visa.financialData.currency,
        passengers: visa.passengers.map(p => ({
            ...p,
            id: `temp-${Math.random()}`,
            applicationNumber: visa.applicationNumber || '',
            visaType: visa.visaType || 'غير محدد',
        } as VisaPassenger))
    }));
    
    const result = await addMultipleVisaBookings(bookingsToSave);

    if (result.success && result.newBookings) {
        toast({ title: "تم حفظ طلبات الفيزا بنجاح", description: `تم حفظ ${result.count} طلب جديد.`});
        onMultipleBookingsAdded(result.newBookings);
        setProcessedVisas([]);
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
            <DialogTitle className="flex items-center gap-2"><Wand2/>أداة الإدخال الذكي للفيزا</DialogTitle>
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
                <div className="space-y-1.5"><Label className="font-bold">المورد</Label><Autocomplete searchAction="suppliers" placeholder="المورد الافتراضي..." value={unifiedData.supplierId} onValueChange={(v) => setUnifiedData(p => ({...p, supplierId: v}))} /></div>
                <div className="space-y-1.5"><Label className="font-bold">العميل</Label><Autocomplete searchAction="clients" placeholder="العميل الافتراضي..." value={unifiedData.clientId} onValueChange={(v) => setUnifiedData(p => ({...p, clientId: v}))} /></div>
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
                        {processedVisas.length === 0 && !isProcessing && (
                            <div className="flex items-center justify-center h-full text-muted-foreground pt-10">
                                <div className="text-center">
                                    <CreditCard className="mx-auto h-24 w-24" />
                                    <p className="mt-4 text-lg font-bold">قائمة انتظار طلبات الفيزا</p>
                                    <p className="text-sm">ابدأ برفع ملفات PDF من الأيقونة في الأعلى.</p>
                                </div>
                            </div>
                        )}
                        {isProcessing && (
                            <div className="space-y-2">
                                <p className="text-sm text-center font-bold text-muted-foreground mb-1">جاري التحليل... ({Math.round(progress)}%)</p>
                                <Progress value={progress} className="h-2 rounded-full" />
                            </div>
                        )}
                        {processedVisas.map((visa) => (
                           <Card key={visa.id} className="relative group shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="p-3 bg-muted/30">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-mono text-base">{visa.applicationNumber || 'N/A'}</Badge>
                                                <Input value={visa.destination} onChange={e => handleVisaDataChange(visa.id, 'destination', e.target.value)} className="h-8 font-bold" placeholder="وجهة السفر" />
                                                <Input value={visa.visaType} onChange={e => handleVisaDataChange(visa.id, 'visaType', e.target.value)} className="h-8 font-bold" placeholder="نوع الفيزا"/>
                                            </div>
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveVisa(visa.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table dir="rtl">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-bold text-right">المسافر</TableHead>
                                                <TableHead className="font-bold text-right">رقم الجواز</TableHead>
                                                <TableHead className="font-bold text-right">شراء</TableHead>
                                                <TableHead className="font-bold text-right">بيع</TableHead>
                                                <TableHead className="font-bold text-right">الربح</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {visa.passengers.map((p, passengerIndex) => {
                                            const profit = (p.salePrice || 0) - (p.purchasePrice || 0);
                                            return (
                                                <TableRow key={`${visa.id}-${passengerIndex}`}>
                                                    <TableCell className="p-2">
                                                        <Input value={p.name} onChange={(e) => handlePassengerChange(visa.id, passengerIndex, 'name', e.target.value)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input value={p.passportNumber} onChange={(e) => handlePassengerChange(visa.id, passengerIndex, 'passportNumber', e.target.value)} className="h-8" />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <NumericInput currency={visa.financialData.currency} currencyClassName={cn(visa.financialData.currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} value={p.purchasePrice} onValueChange={(v) => handlePassengerChange(visa.id, passengerIndex, 'purchasePrice', v || 0)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <NumericInput currency={visa.financialData.currency} currencyClassName={cn(visa.financialData.currency === 'USD' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')} value={p.salePrice} onValueChange={(v) => handlePassengerChange(visa.id, passengerIndex, 'salePrice', v || 0)} className="h-8"/>
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <div className={cn("font-mono text-center font-bold", profit >= 0 ? "text-green-600" : "text-destructive")}>{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                 <CardFooter className="p-3 bg-muted/30 border-t">
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                        <Autocomplete searchAction="suppliers" placeholder="المورد..." value={visa.financialData.supplierId} onValueChange={(v) => handleFinancialDataChange(visa.id, 'supplierId', v)} />
                                        <Autocomplete searchAction="clients" placeholder="العميل..." value={visa.financialData.clientId} onValueChange={(v) => handleFinancialDataChange(visa.id, 'clientId', v)} />
                                        <Select value={visa.financialData.currency} onValueChange={(v) => handleFinancialDataChange(visa.id, 'currency', v)}>
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
                {processedVisas.length > 0 && (
                    <Button size="lg" disabled={isSaving || isProcessing} onClick={handleSaveAll} className="w-full sm:w-auto font-bold bg-accent text-accent-foreground hover:bg-accent/90">
                        {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4" />}
                        حفظ كل الطلبات المعلقة ({processedVisas.length})
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
