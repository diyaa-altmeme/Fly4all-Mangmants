
"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { FlightReport, PnrGroup, DataAuditIssue, Passenger, ExtractedPassenger, FlightReportWithId, ManualDiscount } from '@/lib/types';
import { ChevronDown, Edit, Trash2, MoreHorizontal, AlertTriangle, Download, FileText as InvoiceIcon, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Repeat, Repeat1, XCircle, FileWarning, Briefcase, User, Plane, Calendar as CalendarIcon, Clock, Users, DollarSign, BadgePercent, ShieldCheck, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { format, parseISO, isValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteFlightReport, updateFlightReportSelection, updateManualDiscount } from '../actions';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { produce } from 'immer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// --- Helper Components ---
const formatCurrency = (amount?: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getTripDirection = (route: string) => {
    const IRAQI_AIRPORTS = ['BGW', 'NJF', 'EBL', 'ISU', 'BSR'];
    if (!route || typeof route !== 'string') return null;
    const parts = route.split(/ -> |-/).map(s => s.trim().toUpperCase());
    if (IRAQI_AIRPORTS.includes(parts[0]) && !IRAQI_AIRPORTS.includes(parts[parts.length - 1])) return 'مغادرة';
    if (!IRAQI_AIRPORTS.includes(parts[0]) && IRAQI_AIRPORTS.includes(parts[parts.length - 1])) return 'عودة';
    return null;
};

const TripTypeBadge = ({ type }: { type?: 'DEPARTURE' | 'RETURN' | 'SINGLE' | 'ROUND_TRIP' }) => {
    if (type === 'DEPARTURE') return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">ذهاب</Badge>;
    if (type === 'RETURN') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">عودة</Badge>;
    if (type === 'ROUND_TRIP') return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">ذهاب وعودة</Badge>;
    return <Badge variant="outline">رحلة مفردة</Badge>;
};

const IssueDetailsDialog = ({ issues, open, onOpenChange, title }: { issues: DataAuditIssue[], open: boolean, onOpenChange: (open: boolean) => void, title: string }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>تم العثور على {issues.length} مشكلة.</DialogDescription></DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-4">{issues.map((issue, index) => (
                    <div key={index} className="p-3 border rounded-md bg-muted/50">
                        <p className="font-semibold text-sm">{issue.description}</p>
                        {issue.details && Array.isArray(issue.details) && (
                            <Table><TableHeader><TableRow><TableHead>الملف</TableHead><TableHead>المرجع</TableHead><TableHead>الوجهة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                                <TableBody>{issue.details.map((detail: any, idx: number) => (
                                    <TableRow key={idx}><TableCell><Badge variant="secondary">{detail.fileName}</Badge></TableCell><TableCell className="font-mono">{detail.bookingReference}</TableCell><TableCell>{detail.route}</TableCell><TableCell>{detail.date}</TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        )}
                    </div>
                ))}</div>
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
    const passengerCounts = useMemo(() => (report.passengers || []).reduce((acc, p) => { acc[p.passengerType || 'Adult'] = (acc[p.passengerType || 'Adult'] || 0) + 1; return acc; }, {} as Record<string, number>), [report.passengers]);
    useEffect(() => { if(open) { setDiscount(report.manualDiscount || { type: 'fixed', value: 0 }); setNotes(report.manualDiscountNotes || ''); }}, [open, report]);
    
    const calculatedDiscount = useMemo(() => {
        if (discount.type === 'fixed') return discount.value || 0;
        if (discount.type === 'per_passenger') {
            return ((passengerCounts['Adult'] || 0) * (discount.perAdult || 0)) + ((passengerCounts['Child'] || 0) * (discount.perChild || 0)) + ((passengerCounts['Infant'] || 0) * (discount.perInfant || 0));
        } return 0;
    }, [discount, passengerCounts]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateManualDiscount(report.id, calculatedDiscount, notes, discount);
        if (result.success && result.updatedReport) { toast({ title: "تم حفظ الخصم" }); onSaveSuccess(result.updatedReport); setOpen(false); } 
        else { toast({ title: "خطأ", description: result.error, variant: "destructive" }); }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><BadgePercent className="me-2 h-4 w-4" /> إضافة/تعديل خصم يدوي</DropdownMenuItem></DialogTrigger>
            <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>إدارة الخصم اليدوي</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <RadioGroup value={discount.type} onValueChange={(v) => setDiscount({ type: v as any })} className="grid grid-cols-2 gap-4">
                        <Label className={cn("border rounded-md p-4 text-center cursor-pointer", discount.type === 'fixed' && 'bg-accent text-accent-foreground')}><RadioGroupItem value="fixed" className="sr-only"/>مبلغ ثابت</Label>
                        <Label className={cn("border rounded-md p-4 text-center cursor-pointer", discount.type === 'per_passenger' && 'bg-accent text-accent-foreground')}><RadioGroupItem value="per_passenger" className="sr-only"/>خصم لكل مسافر</Label>
                    </RadioGroup>
                    {discount.type === 'fixed' && <NumericInput value={discount.value} onValueChange={v => setDiscount({ type: 'fixed', value: v || 0 })} />}
                    {discount.type === 'per_passenger' && <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2"><span>بالغ ({passengerCounts['Adult'] || 0})</span><NumericInput value={discount.perAdult} onValueChange={v => setDiscount(d => ({...d, type:'per_passenger', perAdult: v || 0}))} /></div>
                        <div className="grid grid-cols-2 gap-2"><span>طفل ({passengerCounts['Child'] || 0})</span><NumericInput value={discount.perChild} onValueChange={v => setDiscount(d => ({...d, type:'per_passenger', perChild: v || 0}))} /></div>
                        <div className="grid grid-cols-2 gap-2"><span>رضيع ({passengerCounts['Infant'] || 0})</span><NumericInput value={discount.perInfant} onValueChange={v => setDiscount(d => ({...d, type:'per_passenger', perInfant: v || 0}))} /></div>
                    </div>}
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات الخصم (اختياري)"/>
                </div>
                <DialogFooter><Button onClick={handleSave} disabled={isSaving}><Save className="me-2 h-4 w-4"/> حفظ</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SortableHeader = ({ children, column, sortDescriptor, setSortDescriptor }: { children: React.ReactNode, column: any, sortDescriptor: { column: any, direction: any }, setSortDescriptor: (descriptor: { column: any, direction: any }) => void }) => {
    const isSorted = sortDescriptor.column === column;
    const direction = isSorted ? sortDescriptor.direction : 'descending';
    const newDirection = direction === 'ascending' ? 'descending' : 'ascending';
    
    return (
        <Button variant="ghost" className="px-2 py-1 h-auto font-bold" onClick={() => setSortDescriptor({ column, direction: newDirection })}>
            {children}
            {isSorted && (direction === 'ascending' ? <ArrowUp className="ms-2 h-4 w-4" /> : <ArrowDown className="ms-2 h-4 w-4" />)}
        </Button>
    )
};


const ReportRow = ({ report, index, onDeleteReport, onSelectionChange, onUpdateReport }: {
    report: FlightReportWithId; index: number; onDeleteReport: (id: string) => void;
    onSelectionChange: (id: string, isSelected: boolean) => void; onUpdateReport: (updatedReport: FlightReportWithId) => void;
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

    return (
        <React.Fragment>
            <TableRow className={cn(report.isSelectedForReconciliation ? 'bg-blue-50 dark:bg-blue-900/20' : '')}>
                <TableCell className="text-center"><Checkbox onCheckedChange={(c) => handleSelectChange(!!c)} checked={report.isSelectedForReconciliation} /></TableCell>
                <TableCell>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                </TableCell>
                <TableCell>{report.supplierName}</TableCell>
                <TableCell className="font-semibold">{report.route}{tripDirection && <Badge variant="outline" className="ms-2">{tripDirection}</Badge>}</TableCell>
                <TableCell>{isValid(parseISO(report.flightDate)) ? format(parseISO(report.flightDate), 'yyyy-MM-dd') : report.flightDate}</TableCell>
                <TableCell className="text-center">{report.paxCount}</TableCell>
                <TableCell className="font-mono text-center">{formatCurrency(report.totalRevenue)}</TableCell>
                <TableCell className="font-mono text-center text-blue-600">{formatCurrency(report.totalDiscount)}</TableCell>
                <TableCell className="font-mono text-center text-orange-600">{formatCurrency(report.manualDiscountValue)}</TableCell>
                <TableCell className="font-mono text-center font-bold text-green-600">{formatCurrency(report.filteredRevenue)}</TableCell>
                <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-1">
                        {report.issues?.duplicatePnr.length > 0 && <TooltipProvider><Tooltip><TooltipTrigger><Badge variant="destructive" className="cursor-pointer" onClick={() => setShowPnrIssues(true)}>{report.issues.duplicatePnr.length}</Badge></TooltipTrigger><TooltipContent><p>تكرار مرجع الحجز</p></TooltipContent></Tooltip></TooltipProvider>}
                        {report.issues?.fileAnalysis.length > 0 && <TooltipProvider><Tooltip><TooltipTrigger><Badge variant="destructive" className="bg-yellow-500 cursor-pointer" onClick={() => setShowFileIssues(true)}>{report.issues.fileAnalysis.length}</Badge></TooltipTrigger><TooltipContent><p>تكرار ملف الرحلة</p></TooltipContent></Tooltip></TooltipProvider>}
                    </div>
                </TableCell>
                <TableCell className="text-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <ManualDiscountDialog report={report} onSaveSuccess={onUpdateReport} />
                            <DropdownMenuItem><InvoiceIcon className="me-2 h-4 w-4" /> عرض فاتورة</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-500"><Trash2 className="me-2 h-4 w-4" />حذف التقرير</DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا التقرير بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant:'destructive'}))}>نعم، احذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <TableRow>
                    <TableCell colSpan={12} className="p-0">
                        {/* ... Collapsible Content Implementation ... */}
                    </TableCell>
                </TableRow>
            </CollapsibleContent>
        </React.Fragment>
    );
};


// --- المكون الرئيسي: جدول التقارير ---
export default function FlightReportsTable({ reports, sortDescriptor, setSortDescriptor, onSelectionChange, onUpdateReport, onDeleteReport }: any) {
    const [openRowIndex, setOpenRowIndex] = React.useState<number | null>(null);
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
                        <TableHead className="w-[50px] text-center"><Checkbox checked={reports.length > 0 && selectedIds.size === reports.length} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead><SortableHeader column="supplierName" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>المورد</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="route" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الوجهة</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="flightDate" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>تاريخ الرحلة</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="paxCount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الركاب</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="totalRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الإجمالي</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="totalDiscount" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>خصم العودة</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="manualDiscountValue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>خصم يدوي</SortableHeader></TableHead>
                        <TableHead><SortableHeader column="filteredRevenue" sortDescriptor={sortDescriptor} setSortDescriptor={setSortDescriptor}>الصافي</SortableHeader></TableHead>
                        <TableHead>المشاكل</TableHead>
                        <TableHead>الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="h-24 text-center">لا توجد تقارير محفوظة.</TableCell></TableRow>
                    ) : reports.map((report: FlightReportWithId, index: number) => (
                        <ReportRow key={report.id} report={report} index={index} onDeleteReport={onDeleteReport} onSelectionChange={handleSelectRow} onUpdateReport={onUpdateReport}/>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
