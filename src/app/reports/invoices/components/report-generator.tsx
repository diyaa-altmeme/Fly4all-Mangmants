

"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Loader2, Search, Filter, ArrowDown, ArrowUp, HandCoins, ListTree, FilePenLine, ChevronDown, FileSpreadsheet, FileBarChart, BookOpen, Book, SlidersHorizontal, Printer, Ticket, RefreshCw, Briefcase, BedDouble, Users as UsersIcon, Shield, Train, Settings, CreditCard, Wallet, GitBranch, Banknote, BookUser, FileDown, FileUp, ArrowRightLeft, Repeat, XCircle, CheckCheck, Smartphone, MoreHorizontal } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import type { Box, ReportInfo, ReportTransaction, Currency, AccountType, Client, Supplier, StructuredDescription } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAccountStatement } from '../../actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const formatCurrencyDisplay = (amount: number, currency: string) => {
    if (amount === 0) return `0`;
    const formattedAmount = new Intl.NumberFormat('en-US').format(Math.abs(amount));
    return `${amount < 0 ? `(${formattedAmount})` : formattedAmount}`;
};

const StructuredDescriptionDisplay = ({ data, isDetailed }: { data: StructuredDescription, isDetailed: boolean }) => {
    if (!isDetailed) {
        return <span className="whitespace-pre-wrap">{data.title}</span>;
    }

    return (
        <div className="space-y-3 p-2 text-xs text-right w-full">
            <div className="flex items-center gap-2">
                <Badge variant="secondary">{data.title}</Badge>
            </div>
             {data.totalReceived && <span className="font-mono font-bold text-sm">{data.totalReceived}</span>}
            {data.selfReceipt && (
                <div className="flex items-center gap-2 font-medium ps-2">
                    <HandCoins className="h-4 w-4 text-blue-500" />
                    <span>تسوية حساب:</span>
                    <span className="font-mono">{data.selfReceipt}</span>
                </div>
            )}
            {data.distributions.length > 0 && (
                <div className="ps-4">
                    <div className="flex items-center gap-2 font-medium mb-1">
                        <ListTree className="h-4 w-4 text-purple-500" />
                        <span>التوزيعات:</span>
                    </div>
                    <ul className="list-disc ps-8 space-y-1">
                        {data.distributions.map((dist, i) => (
                            <li key={i}><span className="font-semibold">{dist.name}:</span> <span className="font-mono text-muted-foreground">{dist.amount}</span></li>
                        ))}
                    </ul>
                </div>
            )}
            {data.notes && (
                <div className="flex items-start gap-2 text-muted-foreground pt-2 border-t mt-2 ps-2">
                    <FilePenLine className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{data.notes}</span>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, valueUSD, valueIQD, icon: Icon, colorClass, arrow }: { title: string; valueUSD: string; valueIQD: string, icon?: React.ElementType; colorClass?: string, arrow?: 'up' | 'down' }) => (
    <Card className="flex-1">
        <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
                 <p className="text-muted-foreground font-bold">{title}</p>
                 <div className="flex items-center gap-2">
                    {arrow === 'up' && <ArrowUp className="h-5 w-5 text-green-500" />}
                    {arrow === 'down' && <ArrowDown className="h-5 w-5 text-red-500" />}
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                 </div>
            </div>
            <div className="text-right">
                <p className={cn("text-2xl font-bold", colorClass)}>{valueUSD}</p>
                <p className={cn("text-lg font-bold text-muted-foreground/80", colorClass)}>{valueIQD}</p>
            </div>
        </CardContent>
    </Card>
);

const mainOperationsFilters = [
    { id: 'booking', label: 'حجز طيران', icon: Ticket },
    { id: 'visa', label: 'طلب فيزا', icon: CreditCard },
    { id: 'subscription', label: 'اشتراك', icon: Repeat },
    { id: 'journal_from_remittance', label: 'حوالة مستلمة', icon: ArrowRightLeft },
];

const voucherTypeFilters = [
    { id: 'journal_from_standard_receipt', label: 'سند قبض عادي', icon: FileDown },
    { id: 'journal_from_distributed_receipt', label: 'سند قبض مخصص', icon: GitBranch },
    { id: 'journal_from_payment', label: 'سند دفع', icon: FileUp },
    { id: 'journal_from_expense', label: 'سند مصاريف', icon: Banknote },
    { id: 'journal_voucher', label: 'قيد محاسبي', icon: BookUser },
    { id: 'refund', label: 'استرجاع تذكرة', icon: RefreshCw },
    { id: 'exchange', label: 'تغيير تذكرة', icon: RefreshCw },
    { id: 'void', label: 'إلغاء (فويد)', icon: XCircle },
];


export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId, transactionType }: { boxes: Box[], clients: Client[], suppliers: Supplier[], defaultAccountId?: string, transactionType?: 'profits' | 'expenses' }) {
    
    const [report, setReport] = useState<ReportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const allFilters = [...mainOperationsFilters, ...voucherTypeFilters];
    const [typeFilter, setTypeFilter] = useState<Set<string>>(
        new Set(allFilters.map(f => f.id))
    );

    const { control, watch, handleSubmit, setValue } = useForm<{
        accountId: string;
        currency: Currency | 'both';
        dateRange: DateRange | undefined;
        reportType: 'summary' | 'detailed';
    }>({
        defaultValues: {
            accountId: defaultAccountId || '',
            currency: 'both',
            dateRange: { from: subDays(new Date(), 30), to: new Date() },
            reportType: 'summary',
        }
    });

    const accountOptions = useMemo(() => {
        const clientOptions = clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
        const supplierOptions = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
        const boxOptions = boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}`}));
        return [...clientOptions, ...supplierOptions, ...boxOptions];
    }, [clients, suppliers, boxes]);


    const handleGenerateReport = useCallback(async (data: any) => {
        if (!data.accountId) {
            toast({ title: 'مدخلات غير كاملة', description: 'الرجاء اختيار حساب صحيح.', variant: 'destructive', });
            return;
        }

        setIsLoading(true);
        setReport(null);
        try {
            const reportData = await getAccountStatement({
                accountId: data.accountId,
                currency: data.currency,
                dateRange: { from: data.dateRange?.from, to: data.dateRange?.to },
                reportType: data.reportType,
                transactionType: transactionType,
            });
            setReport(reportData);
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل في جلب بيانات التقرير.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, transactionType]);
    
    const filteredTransactions = useMemo(() => {
        if (!report) return [];
        if (typeFilter.size === allFilters.length) return report.transactions;
        const voucherTypeLabels = Array.from(typeFilter).map(typeKey => {
            const mainOp = mainOperationsFilters.find(f => f.id === typeKey);
            if (mainOp) return mainOp.label;
            const voucherOp = voucherTypeFilters.find(f => f.id === typeKey);
            if (voucherOp) return voucherOp.label;
            return typeKey;
        });
        return report.transactions.filter(tx => voucherTypeLabels.includes(tx.type));
    }, [report, typeFilter, allFilters]);

    const handleExportExcel = () => {
        if (!report) {
            toast({ title: "لا يوجد تقرير لتصديره", variant: "destructive" });
            return;
        }

        const reportTitle = report.title;
        const dateRange = `From: ${format(watch('dateRange.from')!, 'yyyy-MM-dd')} To: ${format(watch('dateRange.to')!, 'yyyy-MM-dd')}`;
        
        const summaryData = [
            [reportTitle],
            [dateRange],
            [], // Empty row for spacing
            ["Balance", "USD", "IQD"],
            ["Opening Balance", report.openingBalanceUSD, report.openingBalanceIQD],
            ["Total Debit", report.totalDebitUSD, report.totalDebitIQD],
            ["Total Credit", report.totalCreditUSD, report.totalCreditIQD],
            ["Final Balance", report.finalBalanceUSD, report.finalBalanceIQD],
        ];

        const transactionsData = filteredTransactions.map((tx, index) => {
            let description = tx.description;
            if (typeof description === 'object') {
                 description = `${description.title}: ${description.totalReceived}. ${description.notes}`;
            }

            return {
                '#': index + 1,
                'التاريخ': format(parseISO(tx.date), 'yyyy-MM-dd HH:mm'),
                'نوع الحركة': tx.type,
                'رقم السند': tx.invoiceNumber,
                'البيان': description,
                'مدين': tx.debit,
                'دائن': tx.credit,
                'الرصيد': tx.balance,
                'العملة': tx.currency,
                'الموظف': tx.officer
            };
        });

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.sheet_add_json(ws, transactionsData, { origin: "A10" });
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Account Statement");
        
        XLSX.writeFile(wb, `Account_Statement_${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    };

    const handlePrint = () => {
        if (!report) return;
        const formData = watch();
        const params = new URLSearchParams({
            accountId: formData.accountId,
            currency: formData.currency,
            from: formData.dateRange?.from?.toISOString() || '',
            to: formData.dateRange?.to?.toISOString() || '',
            reportType: formData.reportType,
        });
        window.open(`/reports/account-statement/print?${params.toString()}`, '_blank');
    };
    
    useEffect(() => {
        const accountId = searchParams.get('accountId');
        if (accountId) {
            setValue('accountId', accountId);
            handleGenerateReport({ ...watch(), accountId });
        }
    }, [searchParams, setValue, handleGenerateReport, watch]);

     const handleFilterChange = (filterId: string, checked: boolean) => {
        setTypeFilter(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(filterId);
            } else {
                newSet.delete(filterId);
            }
            return newSet;
        });
    };
    
    const handleSelectAllGlobal = (checked: boolean) => {
        if (checked) {
            setTypeFilter(new Set(allFilters.map(f => f.id)));
        } else {
            setTypeFilter(new Set());
        }
    };
    
    const isAllSelected = typeFilter.size === allFilters.length;


    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6 items-start">
            <aside className="sticky top-20 lg:order-2">
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        <form onSubmit={handleSubmit(handleGenerateReport)} className="space-y-6">
                            <div className="space-y-1.5">
                                <Label className="font-bold">تحديد الحساب</Label>
                                 <Controller
                                    name="accountId"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            searchAction="clients"
                                            includeInactive={true}
                                            value={field.value}
                                            onValueChange={(v) => { field.onChange(v); setReport(null); }}
                                            options={accountOptions}
                                            placeholder="اختر حسابًا..."
                                            disabled={!!defaultAccountId}
                                        />
                                    )}
                                />
                            </div>
                        
                            <Separator />
                        
                            <div>
                                 <div className="flex items-center justify-between mb-2">
                                    <Label className="font-bold">فلترة الحركات</Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="select-all-filters" checked={isAllSelected} onCheckedChange={(c) => handleSelectAllGlobal(!!c)} />
                                        <Label htmlFor="select-all-filters" className="text-xs font-semibold">تحديد الكل</Label>
                                    </div>
                                </div>
                                <Tabs defaultValue="main-ops">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="main-ops" className="text-right justify-center gap-2"><Smartphone className="me-2 h-4 w-4"/>العمليات الرئيسية</TabsTrigger>
                                        <TabsTrigger value="vouchers" className="text-right justify-center gap-2"><FileText className="me-2 h-4 w-4"/>أنواع السندات</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="main-ops" className="mt-4 space-y-2">
                                        {mainOperationsFilters.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between">
                                                <Label htmlFor={`filter-${cat.id}`} className="flex items-center gap-2 flex-grow justify-end cursor-pointer">{cat.label}<cat.icon className="h-4 w-4 text-muted-foreground" /></Label>
                                                <Checkbox id={`filter-${cat.id}`} checked={typeFilter.has(cat.id)} onCheckedChange={(c) => handleFilterChange(cat.id, !!c)} className="mr-2"/>
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <TabsContent value="vouchers" className="mt-4 space-y-2">
                                        {voucherTypeFilters.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between">
                                                <Label htmlFor={`filter-${cat.id}`} className="flex items-center gap-2 flex-grow justify-end cursor-pointer">{cat.label}<cat.icon className="h-4 w-4 text-muted-foreground" /></Label>
                                                <Checkbox id={`filter-${cat.id}`} checked={typeFilter.has(cat.id)} onCheckedChange={(c) => handleFilterChange(cat.id, !!c)} className="mr-2"/>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                                <h4 className="font-bold">خيارات إضافية</h4>
                                <div className="space-y-1.5"><Label>عملة الكشف</Label>
                                    <Controller name="currency" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="both">كلاهما</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select>)} />
                                </div>
                                <div className="space-y-1.5"><Label>نوع الكشف</Label>
                                    <Controller name="reportType" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                                            <SelectItem value="summary"><div className="flex items-center gap-2 justify-end"><Book className="h-4 w-4"/><span>كشف مختصر</span></div></SelectItem>
                                            <SelectItem value="detailed"><div className="flex items-center gap-2 justify-end"><BookOpen className="h-4 w-4"/><span>كشف تفصيلي</span></div></SelectItem>
                                        </SelectContent></Select>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5"><Label>من تاريخ</Label>
                                        <Controller
                                            name="dateRange"
                                            control={control}
                                            render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button id="date-from" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                                                            <CalendarIcon className="me-2 h-4 w-4" />
                                                            {field.value?.from ? format(field.value.from, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="end">
                                                        <Calendar initialFocus mode="single" selected={field.value?.from} onSelect={(day) => field.onChange({ ...field.value, from: day })} />
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-1.5"><Label>إلى تاريخ</Label>
                                        <Controller
                                            name="dateRange"
                                            control={control}
                                            render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button id="date-to" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.to && "text-muted-foreground")}>
                                                            <CalendarIcon className="me-2 h-4 w-4" />
                                                            {field.value?.to ? format(field.value.to, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="end">
                                                        <Calendar initialFocus mode="single" selected={field.value?.to} onSelect={(day) => field.onChange({ ...field.value, to: day })} />
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button size="lg" type="submit" disabled={isLoading || !watch('accountId')} className="w-full">
                                {isLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/> جاري العرض...</> : <><Search className="me-2 h-4 w-4"/>عرض التقرير</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </aside>
             <div className="space-y-6 lg:order-1">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>كشف الحساب</CardTitle>
                                <CardDescription>عرض تفصيلي لجميع الحركات المالية المتعلقة بالحساب المحدد.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" disabled={!report}>
                                            <Download className="me-2 h-4 w-4"/> التصدير والطباعة
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={handleExportExcel}>
                                            <FileSpreadsheet className="me-2 h-4 w-4 text-green-600"/> تصدير Excel
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handlePrint}>
                                            <FileBarChart className="me-2 h-4 w-4 text-red-600"/> طباعة PDF
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline"><Settings className="me-2 h-4 w-4"/> إعدادات</Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="إجمالي مدين" valueUSD={formatCurrencyDisplay(report?.totalDebitUSD || 0, 'USD')} valueIQD={formatCurrencyDisplay(report?.totalDebitIQD || 0, 'IQD')} colorClass="text-red-500" arrow="down" />
                    <StatCard title="إجمالي دائن" valueUSD={formatCurrencyDisplay(report?.totalCreditUSD || 0, 'USD')} valueIQD={formatCurrencyDisplay(report?.totalCreditIQD || 0, 'IQD')} colorClass="text-green-500" arrow="up" />
                    <StatCard title="الرصيد النهائي" valueUSD={formatCurrencyDisplay(report?.finalBalanceUSD || 0, 'USD')} valueIQD={formatCurrencyDisplay(report?.finalBalanceIQD || 0, 'IQD')} colorClass="text-primary" icon={Wallet}/>
                </div>
                
                 <div className="border rounded-lg overflow-x-auto bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">#</TableHead>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">النوع</TableHead>
                                <TableHead className="text-right">رقم السند</TableHead>
                                <TableHead className="text-right w-[30%]">البيان</TableHead>
                                <TableHead className="text-right">العملة</TableHead>
                                <TableHead className="text-right text-red-600">مدين</TableHead>
                                <TableHead className="text-right text-green-600">دائن</TableHead>
                                <TableHead className="text-right">الرصيد</TableHead>
                                <TableHead className="text-right">الموظف</TableHead>
                                <TableHead className="text-center">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={8} className="text-right font-semibold">رصيد افتتاحي</TableCell>
                                <TableCell className="text-right font-mono font-bold">
                                     {report?.currency === 'both' || report?.currency === 'USD' ? <div>{formatCurrencyDisplay(report.openingBalanceUSD || 0, 'USD')}</div> : null}
                                     {report?.currency === 'both' || report?.currency === 'IQD' ? <div>{formatCurrencyDisplay(report.openingBalanceIQD || 0, 'IQD')}</div> : null}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-48 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTransactions.map((tx, index) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{format(parseISO(tx.date), 'yyyy-MM-dd HH:mm')}</TableCell>
                                    <TableCell><Badge variant="outline">{tx.type}</Badge></TableCell>
                                    <TableCell className="font-mono text-xs">{tx.invoiceNumber}</TableCell>
                                    <TableCell>
                                        {typeof tx.description === 'string' ? (
                                            <span className="text-xs">{tx.description}</span>
                                        ) : (
                                            <StructuredDescriptionDisplay data={tx.description} isDetailed={watch('reportType') === 'detailed'} />
                                        )}
                                    </TableCell>
                                     <TableCell className="font-mono">{tx.currency}</TableCell>
                                    <TableCell className="font-mono text-red-600">{tx.debit > 0 ? `${formatCurrencyDisplay(tx.debit, '')}` : '-'}</TableCell>
                                    <TableCell className="font-mono text-green-600">{tx.credit > 0 ? `${formatCurrencyDisplay(tx.credit, '')}` : '-'}</TableCell>
                                    <TableCell className="font-mono font-bold">{formatCurrencyDisplay(tx.balance, tx.currency)}</TableCell>
                                    <TableCell>{tx.officer}</TableCell>
                                    <TableCell className="text-center"><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                             {!isLoading && report && filteredTransactions.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">لا توجد حركات لهذه الفترة.</TableCell>
                                </TableRow>
                            )}
                            {!isLoading && !report && (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-48 text-center">
                                         <div className="flex flex-col items-center justify-center text-center p-12">
                                            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                                            <p className="mt-4 text-muted-foreground">
                                                الرجاء اختيار حساب وتحديد الفترة لعرض النتائج.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 {report && (
                    <CardFooter className="justify-between pt-4 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground font-bold">إجمالي المدين</p>
                                { (report.totalDebitUSD || 0) > 0 && <p className="font-bold font-mono text-red-600">{formatCurrencyDisplay(report.totalDebitUSD || 0, 'USD')}</p>}
                                { (report.totalDebitIQD || 0) > 0 && <p className="font-bold font-mono text-red-600">{formatCurrencyDisplay(report.totalDebitIQD || 0, 'IQD')}</p>}
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground font-bold">إجمالي الدائن</p>
                                { (report.totalCreditUSD || 0) > 0 && <p className="font-bold font-mono text-green-600">{formatCurrencyDisplay(report.totalCreditUSD || 0, 'USD')}</p>}
                                { (report.totalCreditIQD || 0) > 0 && <p className="font-bold font-mono text-green-600">{formatCurrencyDisplay(report.totalCreditIQD || 0, 'IQD')}</p>}
                            </div>
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <p className="text-sm text-primary font-bold">الرصيد الختامي USD</p>
                                <p className="font-bold font-mono text-primary">{formatCurrencyDisplay(report.finalBalanceUSD || 0, 'USD')}</p>
                            </div>
                             <div className="p-3 bg-primary/10 rounded-lg">
                                <p className="text-sm text-primary font-bold">الرصيد الختامي IQD</p>
                                <p className="font-bold font-mono text-primary">{formatCurrencyDisplay(report.finalBalanceIQD || 0, 'IQD')}</p>
                            </div>
                        </div>
                    </CardFooter>
                 )}
            </div>
        </div>
    )
}
