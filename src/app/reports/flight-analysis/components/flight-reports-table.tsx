
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { FlightReport, PnrGroup, DataAuditIssue, Passenger, ExtractedPassenger, FlightReportWithId, ManualDiscount } from '@/lib/types';
import { ChevronDown, Edit, Trash2, MoreHorizontal, AlertTriangle, Download, FileText as InvoiceIcon, ExternalLink, ArrowUpDown, ArrowRight, ArrowLeft, CheckCircle, Repeat, Repeat1, XCircle, FileWarning, Briefcase, User, Plane, Calendar as CalendarIcon, Clock, Users, DollarSign, BadgePercent, ShieldCheck, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { format, parseISO, isValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteFlightReport, updateFlightReportSelection, updateManualDiscount } from '../actions';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeName } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { produce } from 'immer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


const formatCurrency = (amount?: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '$0.00';
    }
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getTripDirection = (route: string) => {
    const IRAQI_AIRPORTS = ['BGW', 'NJF', 'EBL', 'ISU', 'BSR'];
    if (!route || typeof route !== 'string') return null;
    const parts = route.split(/ -> |-/).map(s => s.trim().toUpperCase());
    const from = parts[0];
    const to = parts[parts.length - 1]; // Get the final destination
    
    const fromIsIraqi = IRAQI_AIRPORTS.includes(from);
    const toIsIraqi = IRAQI_AIRPORTS.includes(to);

    if (fromIsIraqi && !toIsIraqi) return 'مغادرة من العراق';
    if (!fromIsIraqi && toIsIraqi) return 'رحلة عودة إلى العراق';
    
    return null;
};

const TripTypeBadge = ({ type }: { type?: 'DEPARTURE' | 'RETURN' | 'SINGLE' | 'ROUND_TRIP' }) => {
    
    if (type === 'DEPARTURE') {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">ذهاب فقط</Badge>;
    }
    if (type === 'RETURN') {
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">عودة</Badge>;
    }
     if (type === 'ROUND_TRIP') {
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">ذهاب وعودة</Badge>;
    }

    return <Badge variant="outline">رحلة مفردة</Badge>;
};

const IssueDetailsDialog = ({ issues, open, onOpenChange, title }: { issues: DataAuditIssue[], open: boolean, onOpenChange: (open: boolean) => void, title: string }) => {
    if (!issues || issues.length === 0) return null;
    
    const description = `تم العثور على ${issues.length} مشكلة من هذا النوع.`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-4">
                        {issues.map((issue, index) => (
                            <div key={index} className="p-3 border rounded-md bg-muted/50">
                                <p className="font-semibold text-sm">{issue.description}</p>
                                {issue.details && Array.isArray(issue.details) && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>الملف</TableHead>
                                                    <TableHead>المرجع</TableHead>
                                                    <TableHead>PNR</TableHead>
                                                    <TableHead>عدد المسافرين</TableHead>
                                                    <TableHead>الوجهة</TableHead>
                                                    <TableHead>نوع الرحلة</TableHead>
                                                    <TableHead>التاريخ</TableHead>
                                                    <TableHead>الوقت</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {issue.details.map((detail: any, idx: number) => {
                                                    const detailDate = detail.date;
                                                    const formattedDate = detailDate instanceof Date ? format(detailDate, 'yyyy-MM-dd') : (typeof detailDate === 'string' && isValid(parseISO(detailDate)) ? format(parseISO(detailDate), 'yyyy-MM-dd') : detailDate);
                                                    const tripDirection = getTripDirection(detail.route)
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell><Badge variant="secondary">{detail.fileName}</Badge></TableCell>
                                                            <TableCell className="font-mono">{detail.bookingReference}</TableCell>
                                                            <TableCell className="font-mono">{detail.pnr}</TableCell>
                                                            <TableCell className="font-bold text-center">{detail.paxCount}</TableCell>
                                                            <TableCell>{detail.route}</TableCell>
                                                            <TableCell><Badge variant={tripDirection === 'مغادرة من العراق' ? 'default' : 'outline'}>{tripDirection}</Badge></TableCell>
                                                            <TableCell>{formattedDate}</TableCell>
                                                            <TableCell>{detail.time}</TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};


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


type SortKey = keyof FlightReport | 'totalRevenue' | 'paxCount' | 'filteredRevenue' | 'supplierName';
type SortDirection = 'ascending' | 'descending';

const SortableHeader = ({
  children,
  sortKey,
  sortDescriptor,
  setSortDescriptor
}: {
  children: React.ReactNode,
  sortKey: SortKey,
  sortDescriptor: { column: SortKey, direction: SortDirection },
  setSortDescriptor: React.Dispatch<React.SetStateAction<{ column: SortKey, direction: SortDirection }>>
}) => {
    const isSorted = sortDescriptor.column === sortKey;
    const direction = isSorted ? sortDescriptor.direction : 'descending';

    const handleSort = () => {
        if (isSorted) {
            setSortDescriptor({
                column: sortKey,
                direction: direction === 'ascending' ? 'descending' : 'ascending'
            });
        } else {
            setSortDescriptor({ column: sortKey, direction: 'descending' });
        }
    };
    
    return (
        <Button variant="ghost" onClick={handleSort} className="w-full justify-center p-0 h-auto font-bold">
            {children}
            {isSorted && (
                <ArrowUpDown className="ms-2 h-4 w-4" />
            )}
        </Button>
    );
};

const RouteDisplay = ({ route }: { route: string }) => {
    const directionText = getTripDirection(route);
    let directionClass = '';

    if (directionText === 'مغادرة من العراق') {
        directionClass = 'text-blue-600';
    } else if (directionText === 'رحلة عودة إلى العراق') {
        directionClass = 'text-green-600';
    }

    return (
        <div>
            <div className="font-mono font-semibold">{route}</div>
            {directionText && <div className={cn("text-xs font-bold", directionClass)}>{directionText}</div>}
        </div>
    );
};

const ReportRow = ({ report, index, onDeleteReport, onSelectionChange, onUpdateReport }: {
    report: FlightReportWithId;
    index: number;
    onDeleteReport: (id: string) => void;
    onSelectionChange: (id: string, isSelected: boolean) => void;
    onUpdateReport: (updatedReport: FlightReportWithId) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTripAnalysisOpen, setIsTripAnalysisOpen] = React.useState(false);
    const [isDuplicatePnrIssuesOpen, setIsDuplicatePnrIssuesOpen] = React.useState(false);
    const [isFileAnalysisOpen, setIsFileAnalysisOpen] = React.useState(false);
    
    const tripAnalysisIssues = report.issues?.tripAnalysis || [];
    const duplicatePnrIssues = report.issues?.duplicatePnr || [];
    const fileAnalysisIssues = report.issues?.fileAnalysis || [];
    const passengerCounts = (report.passengers || []).reduce((acc, p) => {
        const type = p.passengerType || 'Adult';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const passengerCountsText = Object.entries(passengerCounts).map(([type, count]) => `${count} ${type === 'Adult' ? 'بالغ' : type === 'Child' ? 'طفل' : 'رضيع'}`).join(' / ');
    const { toast } = useToast();

    const handleDelete = async () => {
        onDeleteReport(report.id); // Optimistic UI update
        const result = await deleteFlightReport(report.id);
        if (!result.success) {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
            // Here you might want to re-add the report to the list if deletion fails
        } else {
             toast({ title: "تم الحذف بنجاح" });
        }
    };
    
    return (
       <React.Fragment>
            <IssueDetailsDialog issues={tripAnalysisIssues} open={isTripAnalysisOpen} onOpenChange={setIsTripAnalysisOpen} title="تفاصيل رحلات الذهاب والعودة" />
            <IssueDetailsDialog issues={duplicatePnrIssues} open={isDuplicatePnrIssuesOpen} onOpenChange={setIsDuplicatePnrIssuesOpen} title="تفاصيل الـ Booking References المكررة" />
            <IssueDetailsDialog issues={fileAnalysisIssues} open={isFileAnalysisOpen} onOpenChange={setIsFileAnalysisOpen} title="تفاصيل الملفات المكررة" />
            
            <Collapsible asChild>
                <tbody className="border-t bg-card">
                    <TableRow data-state={isOpen ? "open" : "closed"}>
                        <TableCell className="p-3 text-center align-middle font-semibold whitespace-nowrap">{index + 1}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                             <Checkbox
                                id={`select-${report.id}`}
                                checked={report.isSelectedForReconciliation}
                                onCheckedChange={(checked) => onSelectionChange(report.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
                                    <Users className="h-5 w-5"/>
                                </Button>
                            </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{report.supplierName}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap"><RouteDisplay route={report.route} /></TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{report.flightDate}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{report.flightTime}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                            <div className="font-bold">{report.paxCount}</div>
                            <div className="text-xs text-muted-foreground">{passengerCountsText}</div>
                        </TableCell>
                        <TableCell className="p-3 text-center font-mono align-middle whitespace-nowrap">
                            <PriceSummaryDialog report={report} />
                        </TableCell>
                        <TableCell className={cn("p-3 text-center font-mono align-middle font-bold whitespace-nowrap")}>
                            <DiscountDetailsDialog report={report} defaultOpen="auto">
                                <button className={cn("w-full text-center hover:underline", (report.totalDiscount || 0) === 0 ? 'text-foreground' : 'text-orange-600')}>{formatCurrency(report.totalDiscount)}</button>
                            </DiscountDetailsDialog>
                        </TableCell>
                        <TableCell className={cn("p-3 text-center font-mono align-middle font-bold whitespace-nowrap")}>
                             <DiscountDetailsDialog report={report} defaultOpen="manual">
                                <button className={cn("w-full text-center hover:underline", (report.manualDiscountValue || 0) === 0 ? 'text-foreground' : 'text-red-500')}>{formatCurrency(report.manualDiscountValue)}</button>
                            </DiscountDetailsDialog>
                        </TableCell>
                        <TableCell className="p-3 text-center font-bold align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                                <DiscountDetailsDialog report={report}>
                                    <button className={cn("font-mono font-bold p-0 h-auto hover:underline", "text-blue-600")}>
                                        {formatCurrency(report.filteredRevenue)}
                                    </button>
                                </DiscountDetailsDialog>
                            </div>
                        </TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{tripAnalysisIssues.length > 0 ? (<Button variant="secondary" size="sm" className="w-full" onClick={() => setIsTripAnalysisOpen(true)}><Repeat className="me-2 h-4 w-4" /> ذهاب وعودة ({tripAnalysisIssues.length})</Button>) : (<div className="flex items-center justify-center gap-2 font-semibold text-green-600"><CheckCircle className="h-4 w-4" /><span>سليم</span></div>)}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{duplicatePnrIssues.length > 0 ? (<Button variant="destructive" size="sm" className="w-full" onClick={() => setIsDuplicatePnrIssuesOpen(true)}><Repeat1 className="me-2 h-4 w-4" /> تكرار ({duplicatePnrIssues.length})</Button>) : (<div className="flex items-center justify-center gap-2 font-semibold text-green-600"><CheckCircle className="h-4 w-4" /><span>سليم</span></div>)}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">{fileAnalysisIssues.length > 0 ? (<Button variant="destructive" size="sm" className="w-full" onClick={() => setIsFileAnalysisOpen(true)}><FileWarning className="me-2 h-4 w-4" /> ملف مكرر</Button>) : (<div className="flex items-center justify-center gap-2 font-semibold text-green-600"><CheckCircle className="h-4 w-4" /><span>سليم</span></div>)}</TableCell>
                        <TableCell className="p-3 text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <ManualDiscountDialog report={report} onSaveSuccess={onUpdateReport} />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيؤدي هذا الإجراء إلى حذف التقرير بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، احذف</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                        <TableRow>
                            <TableCell colSpan={16} className="p-0">
                                <div className="p-4 bg-muted/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold">تفاصيل المسافرين:</h4>
                                        <Badge variant="outline">{report.fileName}</Badge>
                                    </div>
                                     <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-background">
                                                    <TableHead className="font-semibold">اسم المسافر</TableHead>
                                                    <TableHead className="font-semibold">رقم الجواز</TableHead>
                                                    <TableHead className="font-semibold">نوع المسافر</TableHead>
                                                    <TableHead className="font-semibold">نوع الرحلة</TableHead>
                                                    <TableHead className="text-right font-semibold">السعر</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(report.passengers || []).map((p: ExtractedPassenger & { tripType?: 'DEPARTURE' | 'RETURN' | 'SINGLE' | 'ROUND_TRIP' }, i: number) => (
                                                <TableRow key={p.name + i}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell className="font-mono">{p.passportNumber || '-'}</TableCell>
                                                    <TableCell><Badge variant="outline">{p.passengerType || 'Adult'}</Badge></TableCell>
                                                    <TableCell><TripTypeBadge type={p.tripType} /></TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(p.payable)}</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    </CollapsibleContent>
                </tbody>
            </Collapsible>
        </React.Fragment>
    );
};



interface FlightReportsTableProps {
    reports: FlightReportWithId[];
    sortDescriptor: { column: SortKey, direction: SortDirection };
    setSortDescriptor: React.Dispatch<React.SetStateAction<{ column: SortKey, direction: SortDirection }>>;
    onSelectionChange: (reports: FlightReportWithId[]) => void;
    onUpdateReport: (updatedReport: FlightReportWithId) => void;
    onDeleteReport: (reportId: string) => void;
}

export default function FlightReportsTable({ reports, sortDescriptor, setSortDescriptor, onSelectionChange, onUpdateReport, onDeleteReport }: FlightReportsTableProps) {
    
    const { toast } = useToast();

    useEffect(() => {
        const selected = reports.filter(r => r.isSelectedForReconciliation);
        onSelectionChange(selected);
    }, [reports, onSelectionChange]);

    const handleSelectionChange = (id: string, isSelected: boolean) => {
        const reportToUpdate = reports.find(r => r.id === id);
        if (reportToUpdate) {
            const updatedReport = { ...reportToUpdate, isSelectedForReconciliation: isSelected };
            onUpdateReport(updatedReport);
            updateFlightReportSelection(id, isSelected);
        }
    };
    
    return (
        <div className="w-full">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px] p-3 text-center font-bold">#</TableHead>
                             <TableHead className="w-[80px] p-3 text-center font-bold">التحاسب</TableHead>
                             <TableHead className="w-[50px] p-3 text-center">
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-help">
                                                <Users className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>تفاصيل المسافرين</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableHead>
                             <TableHead className="w-[150px] p-3 text-center">
                                <SortableHeader sortKey="supplierName" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>المصدر</SortableHeader>
                            </TableHead>
                            <TableHead className="w-[140px] p-3 text-center whitespace-nowrap">
                                    <SortableHeader sortKey="route" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2"><Plane className="h-4 w-4"/>الوجهة</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[120px] p-3 text-center whitespace-nowrap">
                                    <SortableHeader sortKey="flightDate" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2"><CalendarIcon className="h-4 w-4"/>تاريخ الرحلة</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[90px] p-3 text-center whitespace-nowrap">
                                    <SortableHeader sortKey="flightTime" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2"><Clock className="h-4 w-4"/>الوقت</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[130px] p-3 text-center whitespace-nowrap">
                                    <SortableHeader sortKey="paxCount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2"><Users className="h-4 w-4"/>المسافرون</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[140px] p-3 text-center">
                                    <SortableHeader sortKey="totalRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2"><DollarSign className="h-4 w-4"/>الإجمالي</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[140px] p-3 text-center">
                                <SortableHeader sortKey="totalDiscount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2 text-orange-600"><BadgePercent className="h-4 w-4"/>خصم تلقائي</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[140px] p-3 text-center">
                                <SortableHeader sortKey="manualDiscountValue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2 text-red-500"><BadgePercent className="h-4 w-4"/>خصم يدوي</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[140px] p-3 text-center">
                                <SortableHeader sortKey="filteredRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}><div className="flex items-center justify-center gap-2 text-blue-600"><DollarSign className="h-4 w-4"/>الصافي</div></SortableHeader>
                            </TableHead>
                            <TableHead className="w-[170px] p-3 text-center font-bold whitespace-nowrap">تحليل الرحلة</TableHead>
                            <TableHead className="w-[170px] p-3 text-center font-bold whitespace-nowrap">الـ B.R المكررة</TableHead>
                            <TableHead className="w-[150px] p-3 text-center font-bold whitespace-nowrap">تحليل الملف</TableHead>
                            <TableHead className="w-[80px] p-3 text-center font-bold whitespace-nowrap">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    
                        {reports.length === 0 ? (
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={16} className="text-center py-8">
                                        لا توجد تقارير محفوظة.
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        ) : reports.map((report, index) => (
                        <ReportRow
                            key={report.id}
                            report={report}
                            index={index}
                            onDeleteReport={onDeleteReport}
                            onSelectionChange={handleSelectionChange}
                            onUpdateReport={onUpdateReport}
                        />
                        ))}
                   
                </Table>
            </div>
        </div>
    );
}
