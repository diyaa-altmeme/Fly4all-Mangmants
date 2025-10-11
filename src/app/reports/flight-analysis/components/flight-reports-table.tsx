
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { FlightReportWithId, ManualDiscount, Passenger, DataAuditIssue } from '@/lib/types';
import { BadgePercent, Save, Trash2, ArrowUpRight, ArrowDownLeft, FilePenLine } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateManualDiscount } from '../actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronDown, Edit, MoreHorizontal, AlertTriangle, Download, FileText as InvoiceIcon, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Repeat, Repeat1, XCircle, FileWarning, Briefcase, User, Plane, Calendar as CalendarIcon, Clock, Users, DollarSign, ShieldCheck, UserSquare, Baby, UserRound, Passport } from 'lucide-react';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteFlightReport, updateFlightReportSelection } from '../actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


/**
 * =================================================================================
 * 1. نافذة ملخص الأسعار (PriceSummaryDialog)
 * =================================================================================
 */
const formatCurrency = (amount?: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PriceSummaryDialog = ({ report }: { report: FlightReportWithId }) => {
    if (!report.payDistribution || report.payDistribution.length === 0) {
        return null;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                 <button className="w-full text-center hover:underline font-mono font-bold">
                    {formatCurrency(report.totalRevenue)}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>ملخص الأسعار لملف: {report.fileName}</DialogTitle>
                    <DialogDescription>
                        توزيع الركاب حسب سعر التذكرة.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>السعر</TableHead>
                                <TableHead>عدد الركاب</TableHead>
                                <TableHead className="text-right">الإجمالي</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.payDistribution.map((p, i) => (
                                <TableRow key={i}>
                                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                                    <TableCell>{p.count}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(p.subtotal)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell className="font-bold">المجموع</TableCell>
                                <TableCell className="font-bold">{report.paxCount}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(report.totalRevenue)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
};


/**
 * =================================================================================
 * 2. نافذة تفاصيل الخصم (DiscountDetailsDialog)
 * =================================================================================
 */
const DiscountDetailsDialog = ({ report, children, defaultOpen }: { report: FlightReportWithId, children: React.ReactNode, defaultOpen?: 'auto' | 'manual' }) => {
    const discountedPassengers = (report.passengers || []).filter(p => p.tripType === 'RETURN');
    const manualDiscount = report.manualDiscount || { type: 'fixed', value: 0 };

    const calculatedManualDiscount = useMemo(() => {
        if (manualDiscount.type === 'fixed') return manualDiscount.value || 0;
        if (manualDiscount.type === 'per_passenger') {
            const passengerCounts = (report.passengers || []).reduce((acc, p) => {
                const type = p.passengerType || 'Adult';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<'Adult' | 'Child' | 'Infant', number>);
            
            const adultDiscount = (passengerCounts['Adult'] || 0) * (manualDiscount.perAdult || 0);
            const childDiscount = (passengerCounts['Child'] || 0) * (manualDiscount.perChild || 0);
            const infantDiscount = (passengerCounts['Infant'] || 0) * (manualDiscount.perInfant || 0);
            return adultDiscount + childDiscount + infantDiscount;
        }
        return 0;
    }, [manualDiscount, report.passengers]);

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>تفاصيل الخصم لملف: {report.fileName}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <Card>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-base">ملخص مالي</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between font-medium"><span className="text-muted-foreground">الإجمالي الأصلي:</span><span className="font-mono">{formatCurrency(report.totalRevenue)}</span></div>
                            <div className="flex justify-between font-medium"><span className="text-muted-foreground">خصم العودة:</span><span className="font-mono text-orange-600">- {formatCurrency(report.totalDiscount)}</span></div>
                            <div className="flex justify-between font-medium"><span className="text-muted-foreground">خصم يدوي:</span><span className="font-mono text-red-600">- {formatCurrency(calculatedManualDiscount)}</span></div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base"><span className="text-primary">الصافي النهائي:</span><span className="font-mono text-primary">{formatCurrency(report.filteredRevenue)}</span></div>
                        </CardContent>
                    </Card>

                    <Accordion type="single" collapsible className="w-full space-y-2" defaultValue={defaultOpen}>
                        <AccordionItem value="auto" className="border rounded-lg bg-background">
                            <AccordionTrigger className="font-semibold px-4 py-3 hover:no-underline">الخصم التلقائي (خصم العودة)</AccordionTrigger>
                            <AccordionContent className="p-4 border-t">
                                {discountedPassengers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا يوجد خصم عودة تلقائي.</p> : (
                                    <div className="max-h-60 overflow-y-auto">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>المسافر</TableHead><TableHead>تاريخ الذهاب</TableHead><TableHead>تاريخ العودة</TableHead><TableHead className="text-right">المبلغ المخصوم</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {discountedPassengers.map((p, i) => (
                                                    <TableRow key={i}><TableCell>{p.name}</TableCell><TableCell>{p.departureDate ? format(parseISO(p.departureDate), 'yyyy-MM-dd') : '-'}</TableCell><TableCell>{report.flightDate ? format(parseISO(report.flightDate), 'yyyy-MM-dd') : '-'}</TableCell><TableCell className="text-right font-mono text-red-500">- {formatCurrency(p.payable)}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="manual" className="border rounded-lg bg-background">
                            <AccordionTrigger className="font-semibold px-4 py-3 hover:no-underline">الخصم اليدوي</AccordionTrigger>
                            <AccordionContent className="p-4 border-t">
                                {calculatedManualDiscount === 0 && !report.manualDiscountNotes ? <p className="text-sm text-muted-foreground text-center py-4">لا يوجد خصم يدوي.</p> : (
                                    <div className="space-y-4">
                                        {manualDiscount.type === 'per_passenger' ? (
                                             <Table>
                                                <TableHeader><TableRow><TableHead>الفئة</TableHead><TableHead>العدد</TableHead><TableHead>خصم الفرد</TableHead><TableHead className="text-right">الإجمالي</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    <TableRow><TableCell>بالغ</TableCell><TableCell>{(report.passengers || []).filter(p=>p.passengerType === 'Adult').length}</TableCell><TableCell>{formatCurrency(manualDiscount.perAdult)}</TableCell><TableCell className="text-right">{formatCurrency((manualDiscount.perAdult || 0) * (report.passengers || []).filter(p=>p.passengerType === 'Adult').length)}</TableCell></TableRow>
                                                    <TableRow><TableCell>طفل</TableCell><TableCell>{(report.passengers || []).filter(p=>p.passengerType === 'Child').length}</TableCell><TableCell>{formatCurrency(manualDiscount.perChild)}</TableCell><TableCell className="text-right">{formatCurrency((manualDiscount.perChild || 0) * (report.passengers || []).filter(p=>p.passengerType === 'Child').length)}</TableCell></TableRow>
                                                    <TableRow><TableCell>رضيع</TableCell><TableCell>{(report.passengers || []).filter(p=>p.passengerType === 'Infant').length}</TableCell><TableCell>{formatCurrency(manualDiscount.perInfant)}</TableCell><TableCell className="text-right">{formatCurrency((manualDiscount.perInfant || 0) * (report.passengers || []).filter(p=>p.passengerType === 'Infant').length)}</TableCell></TableRow>
                                                </TableBody>
                                                <TableFooter><TableRow><TableCell colSpan={3} className="font-bold">المجموع</TableCell><TableCell className="text-right font-bold">{formatCurrency(calculatedManualDiscount)}</TableCell></TableRow></TableFooter>
                                            </Table>
                                        ) : (
                                            <p className="font-semibold text-center p-4">مبلغ ثابت: <span className="font-mono text-red-500">{formatCurrency(calculatedManualDiscount)}</span></p>
                                        )}
                                        {report.manualDiscountNotes && <p className="text-sm text-muted-foreground mt-2 border-t pt-2"><b>ملاحظات:</b> {report.manualDiscountNotes}</p>}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </DialogContent>
        </Dialog>
    );
};


/**
 * =================================================================================
 * 3. نافذة إضافة/تعديل الخصم اليدوي (ManualDiscountDialog)
 * =================================================================================
 */
const ManualDiscountDialog = ({ report, onSaveSuccess }: { report: FlightReportWithId, onSaveSuccess: (updatedReport: FlightReportWithId) => void }) => {
    const [open, setOpen] = useState(false);
    const [discount, setDiscount] = useState<ManualDiscount>(report.manualDiscount || { type: 'fixed', value: 0 });
    const [notes, setNotes] = useState<string>(report.manualDiscountNotes || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const passengerCounts = useMemo(() => 
        (report.passengers || []).reduce((acc, p) => {
            const type = p.passengerType || 'Adult';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<'Adult' | 'Child' | 'Infant', number>),
    [report.passengers]);
    
    useEffect(() => {
        if(open) {
            setDiscount(report.manualDiscount || { type: 'fixed', value: 0 });
            setNotes(report.manualDiscountNotes || '');
        }
    }, [open, report]);
    
     const handleDiscountTypeChange = (type: 'fixed' | 'per_passenger') => {
        if (type === 'fixed') {
            setDiscount({ type: 'fixed', value: 0 });
        } else {
            setDiscount({
                type: 'per_passenger',
                perAdult: 0,
                perChild: 0,
                perInfant: 0,
            });
        }
    };

    const calculatedDiscount = useMemo(() => {
        if (discount.type === 'fixed') {
            return discount.value || 0;
        } else if (discount.type === 'per_passenger') {
            const adultDiscount = (passengerCounts.Adult || 0) * (discount.perAdult || 0);
            const childDiscount = (passengerCounts.Child || 0) * (discount.perChild || 0);
            const infantDiscount = (passengerCounts.Infant || 0) * (discount.perInfant || 0);
            return adultDiscount + childDiscount + infantDiscount;
        }
        return 0;
    }, [discount, passengerCounts]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateManualDiscount(report.id, calculatedDiscount, notes, discount);
        if (result.success && result.updatedReport) {
            toast({ title: "تم حفظ الخصم اليدوي" });
            onSaveSuccess(result.updatedReport);
            setOpen(false);
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDeleteDiscount = async () => {
        setIsSaving(true);
        const result = await updateManualDiscount(report.id, 0, '', undefined);
        if (result.success && result.updatedReport) {
            toast({ title: "تم حذف الخصم اليدوي" });
            onSaveSuccess(result.updatedReport);
            setOpen(false);
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };
    
    
    const netBeforeManualDiscount = (report.totalRevenue || 0) - (report.totalDiscount || 0);
    const newNetAfterDiscount = netBeforeManualDiscount - calculatedDiscount;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <BadgePercent className="me-2 h-4 w-4" /> إضافة / تعديل خصم يدوي
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>إضافة/تعديل الخصم اليدوي</DialogTitle>
                    <DialogDescription>
                        اختر نوع الخصم وأدخل القيم. سيتم خصم المبلغ الإجمالي من صافي الربح.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg text-center bg-muted/50">
                            <Label className="text-xs text-muted-foreground">الصافي قبل الخصم اليدوي</Label>
                            <p className="font-mono font-bold text-lg">{formatCurrency(netBeforeManualDiscount)}</p>
                        </div>
                         <div className="p-3 border rounded-lg text-center border-primary bg-primary/10">
                            <Label className="text-xs text-primary">الصافي الجديد بعد الخصم</Label>
                            <p className="font-mono font-bold text-lg text-primary">{formatCurrency(newNetAfterDiscount)}</p>
                        </div>
                    </div>
                     <RadioGroup 
                        value={discount.type} 
                        onValueChange={handleDiscountTypeChange}
                        className="grid grid-cols-2 gap-4"
                     >
                        <Label htmlFor="type-fixed" className={cn("border rounded-md p-4 text-center cursor-pointer", discount.type === 'fixed' && 'bg-accent text-accent-foreground ring-2 ring-accent')}>
                            <RadioGroupItem value="fixed" id="type-fixed" className="sr-only"/>
                            مبلغ ثابت
                        </Label>
                        <Label htmlFor="type-per-passenger" className={cn("border rounded-md p-4 text-center cursor-pointer", discount.type === 'per_passenger' && 'bg-accent text-accent-foreground ring-2 ring-accent')}>
                             <RadioGroupItem value="per_passenger" id="type-per-passenger" className="sr-only"/>
                             خصم لكل مسافر
                        </Label>
                    </RadioGroup>

                    {discount.type === 'fixed' && (
                        <div className="space-y-1.5">
                            <Label>مبلغ الخصم الإجمالي</Label>
                            <NumericInput
                                value={discount.value}
                                onValueChange={(v) => setDiscount({ type: 'fixed', value: v || 0 })}
                            />
                        </div>
                    )}
                     {discount.type === 'per_passenger' && (
                        <div className="space-y-3 p-3 border rounded-md">
                            <h4 className="font-semibold text-sm">أدخل الخصم لكل فئة</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <Label>فئة المسافر</Label>
                                <Label>قيمة الخصم</Label>
                                <div className="font-medium text-sm flex items-center gap-2">{passengerCounts.Adult || 0} <span className="text-muted-foreground">بالغ</span></div>
                                <NumericInput value={discount.perAdult} onValueChange={v => setDiscount(d => ({ ...d, type: 'per_passenger', perAdult: v || 0 }))} />
                                <div className="font-medium text-sm flex items-center gap-2">{passengerCounts.Child || 0} <span className="text-muted-foreground">طفل</span></div>
                                <NumericInput value={discount.perChild} onValueChange={v => setDiscount(d => ({ ...d, type: 'per_passenger', perChild: v || 0 }))} />
                                <div className="font-medium text-sm flex items-center gap-2">{passengerCounts.Infant || 0} <span className="text-muted-foreground">رضيع</span></div>
                                <NumericInput value={discount.perInfant} onValueChange={v => setDiscount(d => ({ ...d, type: 'per_passenger', perInfant: v || 0 }))} />
                            </div>
                        </div>
                    )}
                     <div className="space-y-1.5">
                        <Label>ملاحظات (اختياري)</Label>
                        <Textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                 <DialogFooter className="justify-between">
                    <Button variant="destructive" onClick={handleDeleteDiscount} disabled={isSaving}>
                         {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Trash2 className="me-2 h-4 w-4" />
                        حذف الخصم
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4" />
                        حفظ الخصم
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const getTripDirection = (route: string) => {
    if (!route) return '';
    const parts = route.split('-');
    if (parts.length < 2) return '';
    if (parts[0].includes('BGW') || parts[0].includes('NJF')) return 'ذهاب';
    if (parts[parts.length - 1].includes('BGW') || parts[parts.length - 1].includes('NJF')) return 'إياب';
    return '';
}

const TripTypeBadge = ({ type }: { type?: Passenger['tripType'] }) => {
    switch (type) {
        case 'DEPARTURE': return <BadgeComponent variant="outline" className="text-blue-600 border-blue-600/50"><ArrowUpRight className="h-3 w-3 me-1"/>ذهاب</BadgeComponent>;
        case 'RETURN': return <BadgeComponent variant="outline" className="text-green-600 border-green-600/50"><ArrowDownLeft className="h-3 w-3 me-1"/>عودة</BadgeComponent>;
        case 'SINGLE': return <BadgeComponent variant="secondary">ذهاب فقط</BadgeComponent>;
        default: return <BadgeComponent variant="ghost">غير محدد</BadgeComponent>;
    }
}

const PassengerTypeIcon = ({ type }: { type: Passenger['passengerType'] }) => {
    const Icon = type === 'Adult' ? UserSquare : type === 'Child' ? User : Baby;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
};

const IssueDetailsDialog = ({ open, onOpenChange, issues, title }: { open: boolean, onOpenChange: (open: boolean) => void, issues: DataAuditIssue[], title: string }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>تم العثور على {issues.length} مشكلة.</DialogDescription>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-2 p-1">
                    {issues.map((issue, index) => (
                        <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>مشكلة في: {issue.pnr || 'ملف مكرر'}</AlertTitle>
                            <AlertDescription>{issue.description}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

const ReportRow = ({ report, index, onSelectionChange, onDeleteReport, onUpdateReport }: {
    report: FlightReportWithId; index: number; onSelectionChange: (id: string, checked: boolean) => void;
    onDeleteReport: (id: string) => void; onUpdateReport: (updatedReport: FlightReportWithId) => void;
}) => {
    const { toast } = useToast();
    const [showPnrIssues, setShowPnrIssues] = useState(false);
    const [showFileIssues, setShowFileIssues] = useState(false);
    
    const handleDelete = async () => {
        const result = await deleteFlightReport(report.id);
        if (result.success && result.deletedId) {
            toast({ title: 'تم حذف التقرير' });
            onDeleteReport(result.deletedId);
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleSelectChange = (checked: boolean) => {
        onSelectionChange(report.id, checked);
    };

    const tripDirection = getTripDirection(report.route);
    
    const hasPnrIssues = (report.issues?.duplicatePnr?.length || 0) > 0;
    const hasFileIssues = (report.issues?.fileAnalysis?.length || 0) > 0;
    const hasReturnTripIssues = (report.issues?.tripAnalysis?.length || 0) > 0;

    return (
        <Collapsible asChild>
            <>
                <TableRow className={cn(report.isSelectedForReconciliation ? 'bg-blue-50 dark:bg-blue-900/20' : '')}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell className="text-center"><Checkbox onCheckedChange={(c) => handleSelectChange(!!c)} checked={report.isSelectedForReconciliation} /></TableCell>
                    <TableCell>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </CollapsibleTrigger>
                    </TableCell>
                    <TableCell>{report.supplierName}</TableCell>
                    <TableCell className="font-semibold">{report.route}{tripDirection && <BadgeComponent variant="outline" className="ms-2">{tripDirection}</BadgeComponent>}</TableCell>
                    <TableCell>{isValid(parseISO(report.flightDate)) ? format(parseISO(report.flightDate), 'yyyy-MM-dd') : report.flightDate}</TableCell>
                    <TableCell className="text-center">{report.flightTime}</TableCell>
                    <TableCell className="text-center">{report.paxCount}</TableCell>
                    <TableCell className="text-center"><PriceSummaryDialog report={report} /></TableCell>
                    <TableCell className="font-mono text-center text-orange-600">
                        <DiscountDetailsDialog report={report} defaultOpen="auto">
                            <button className="w-full text-center hover:underline">{formatCurrency(report.totalDiscount)}</button>
                        </DiscountDetailsDialog>
                    </TableCell>
                    <TableCell className="font-mono text-center text-red-600">
                        <DiscountDetailsDialog report={report} defaultOpen="manual">
                            <button className="w-full text-center hover:underline">{formatCurrency(report.manualDiscountValue)}</button>
                        </DiscountDetailsDialog>
                    </TableCell>
                    <TableCell className="font-mono text-center font-bold text-green-600">{formatCurrency(report.filteredRevenue)}</TableCell>
                    <TableCell className="text-center">{hasFileIssues ? <Button variant="destructive" size="sm" onClick={() => setShowFileIssues(true)}>مكرر ({report.issues?.fileAnalysis.length})</Button> : <BadgeComponent variant="outline">سليم</BadgeComponent>}</TableCell>
                    <TableCell className="text-center">{hasReturnTripIssues ? <BadgeComponent variant="secondary">ذهاب وعودة ({report.issues?.tripAnalysis.length})</BadgeComponent> : <BadgeComponent variant="outline">سليم</BadgeComponent>}</TableCell>
                    <TableCell className="text-center">{hasPnrIssues ? <Button variant="destructive" size="sm" onClick={() => setShowPnrIssues(true)}>تكرار ({report.issues?.duplicatePnr.length})</Button> : <BadgeComponent variant="outline">سليم</BadgeComponent>}</TableCell>
                    <TableCell className="text-center"><BadgeComponent variant="outline">سليم</BadgeComponent></TableCell>
                    <TableCell className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <ManualDiscountDialog report={report} onSaveSuccess={onUpdateReport} />
                                <DropdownMenuItem><InvoiceIcon className="me-2 h-4 w-4" /> عرض فاتورة</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-500"><Trash2 className="me-2 h-4 w-4" />حذف التقرير</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                            <AlertDialogDescription>سيتم حذف هذا التقرير بشكل دائم.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant:'destructive'}))}>نعم، احذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={17} className="p-0">
                            <div className="p-4 bg-muted/50">
                                <h4 className="font-bold mb-2">تفاصيل المسافرين:</h4>
                                <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-background">
                                            <TableHead className="font-semibold">المسافر</TableHead>
                                            <TableHead className="font-semibold">الجواز</TableHead>
                                            <TableHead className="font-semibold">PNR / مرجع الحجز</TableHead>
                                            <TableHead className="text-center font-semibold">نوع الرحلة</TableHead>
                                            <TableHead className="text-center font-semibold">السعر المدفوع</TableHead>
                                            <TableHead className="text-center font-semibold">السعر الفعلي</TableHead>
                                            <TableHead className="text-center font-semibold">الحالة</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(report.passengers || []).map((p, i) => (
                                            <TableRow key={`${p.name}-${i}`}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <PassengerTypeIcon type={p.passengerType!} />
                                                        <span className="font-medium">{p.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono">{p.passportNumber || '-'}</TableCell>
                                                <TableCell className="font-mono">{p.pnrClass} / {p.bookingReference}</TableCell>
                                                <TableCell className="text-center"><TripTypeBadge type={p.tripType} /></TableCell>
                                                <TableCell className="text-center font-mono">{formatCurrency(p.payable)}</TableCell>
                                                <TableCell className="text-center font-mono font-bold text-primary">{formatCurrency(p.actualPrice)}</TableCell>
                                                <TableCell className="text-center">
                                                    {(report.issues?.tripAnalysis || []).find(issue => issue.details?.some((d: any) => d.bookingReference === p.bookingReference)) 
                                                        ? <BadgeComponent variant="secondary">ذهاب وعودة</BadgeComponent>
                                                        : <BadgeComponent variant="outline">ذهاب فقط</BadgeComponent>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
                 {report.issues && <IssueDetailsDialog issues={report.issues.duplicatePnr} open={showPnrIssues} onOpenChange={setShowPnrIssues} title="مشاكل تكرار مرجع الحجز" />}
                {report.issues && <IssueDetailsDialog issues={report.issues.fileAnalysis} open={showFileIssues} onOpenChange={setShowFileIssues} title="مشاكل تكرار ملف الرحلة" />}
            </>
        </Collapsible>
    );
};

type SortKey = keyof FlightReport | 'totalRevenue' | 'paxCount' | 'filteredRevenue' | 'supplierName' | 'totalDiscount' | 'manualDiscountValue';
type SortDirection = 'ascending' | 'descending';

const SortableHeader = ({ column, sortDescriptor, setSortDescriptor, children }: {
    column: SortKey;
    sortDescriptor: { column: SortKey, direction: SortDirection };
    setSortDescriptor: (descriptor: { column: SortKey, direction: SortDirection }) => void;
    children: React.ReactNode;
}) => {
    const isSorted = sortDescriptor.column === column;
    const direction = isSorted ? sortDescriptor.direction : 'descending';
    const newDirection = direction === 'ascending' ? 'descending' : 'ascending';
    return (
        <Button variant="ghost" className="px-2 py-1 h-auto" onClick={() => setSortDescriptor({ column, direction: newDirection })}>
            {children}
            {isSorted && (direction === 'ascending' ? <ArrowUp className="ms-2 h-4 w-4" /> : <ArrowDown className="ms-2 h-4 w-4" />)}
        </Button>
    )
};


// --- Main Table Component ---
export default function FlightReportsTable({ reports, sortDescriptor, setSortDescriptor, onSelectionChange, onUpdateReport, onDeleteReport }: any) {
    const [selectedIds, setSelectedIds] = React.useState(new Set<string>());

    React.useEffect(() => {
        const selected = reports.filter((r:any) => selectedIds.has(r.id));
        onSelectionChange(selected);
    }, [selectedIds, reports, onSelectionChange]);

    const handleSelectAll = (checked: boolean) => {
        const newSelectedIds = new Set<string>();
        if (checked) {
            reports.forEach((r:any) => newSelectedIds.add(r.id));
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedIds(produce(draft => {
            if (checked) {
                draft.add(id);
            } else {
                draft.delete(id);
            }
        }));
    };

    return (
         <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-center">#</TableHead>
                        <TableHead className="w-[50px] text-center"><Checkbox checked={reports.length > 0 && selectedIds.size === reports.length} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead><SortableHeader column="supplierName" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>المصدر</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="route" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الوجهة</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="flightDate" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>تاريخ الرحلة</SortableHeader></TableHead>
                        <TableHead className="text-center">الوقت</TableHead>
                        <TableHead><SortableHeader column="paxCount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>المسافرون</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="totalRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الإجمالي</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="totalDiscount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>خصم تلقائي</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="manualDiscountValue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>خصم يدوي</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="filteredRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الصافي</SortableHeader></TableHead>
                        <TableHead>تحليل الملف</TableHead>
                        <TableHead>تحليل الرحلة</TableHead>
                        <TableHead>الـ B.R المكررة</TableHead>
                        <TableHead>التحاسب</TableHead>
                        <TableHead>الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.length === 0 ? (
                        <TableRow><TableCell colSpan={17} className="h-24 text-center">لا توجد تقارير محفوظة.</TableCell></TableRow>
                    ) : reports.map((report: FlightReportWithId, index: number) => (
                        <ReportRow key={report.id} report={report} index={index} onDeleteReport={onDeleteReport} onSelectionChange={handleSelectRow} onUpdateReport={onUpdateReport}/>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

    