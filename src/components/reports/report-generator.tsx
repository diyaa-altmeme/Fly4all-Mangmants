
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Loader2, Search, Filter, ArrowDown, ArrowUp, HandCoins, ListTree, FilePenLine, ChevronDown, FileSpreadsheet, FileBarChart, BookOpen, Book, SlidersHorizontal, Printer, Ticket, RefreshCw, Briefcase, BedDouble, Users as UsersIcon, Shield, Train, Settings, CreditCard, Wallet, GitBranch, Banknote, BookUser, FileDown, FileUp, ArrowRightLeft, Repeat, XCircle, CheckCheck, Smartphone, MoreHorizontal, Layers3, Share2 } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO, isValid } from "date-fns";
import type { Box, ReportInfo, ReportTransaction, Currency, AccountType, Client, Supplier, StructuredDescription } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAccountStatement } from '@/app/reports/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Utility and Sub-components
const formatCurrencyDisplay = (amount: number, currency: string) => {
    if (amount === null || amount === undefined) return `0.00 ${currency}`;
    const formattedAmount = new Intl.NumberFormat('en-US').format(Math.abs(amount));
    return `${amount < 0 ? `(${formattedAmount})` : formattedAmount} ${currency}`;
};

const StructuredDescriptionDisplay = ({ data, isDetailed }: { data: StructuredDescription, isDetailed: boolean }) => {
    if (!isDetailed || !data) {
        return <span className="whitespace-pre-wrap">{typeof data === 'string' ? data : data.title}</span>;
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

const allFilters = [
    { id: 'booking', label: 'حجز طيران', icon: Ticket },
    { id: 'visa', label: 'طلب فيزا', icon: CreditCard },
    { id: 'subscription', label: 'اشتراك', icon: Repeat },
    { id: 'journal_from_remittance', label: 'حوالة مستلمة', icon: ArrowRightLeft },
    { id: 'segment', label: 'سكمنت', icon: Layers3 },
    { id: 'profit_distribution', label: 'توزيع الحصص', icon: Share2 },
    { id: 'journal_from_standard_receipt', label: 'سند قبض عادي', icon: FileDown },
    { id: 'journal_from_distributed_receipt', label: 'سند قبض مخصص', icon: GitBranch },
    { id: 'journal_from_payment', label: 'سند دفع', icon: FileUp },
    { id: 'journal_from_expense', label: 'سند مصاريف', icon: Banknote },
    { id: 'journal_voucher', label: 'قيد محاسبي', icon: BookUser },
    { id: 'refund', label: 'استرجاع تذكرة', icon: RefreshCw },
    { id: 'exchange', label: 'تغيير تذكرة', icon: RefreshCw },
    { id: 'void', label: 'إلغاء (فويد)', icon: XCircle },
];


export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId }: { boxes: Box[], clients: Client[], suppliers: Supplier[], defaultAccountId?: string }) {
    
    const [report, setReport] = useState<ReportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

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
    
    const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set(allFilters.map(f => f.id)));

    const accountOptions = useMemo(() => {
        const clientOptions = clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
        const supplierOptions = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
        const boxOptions = boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}` }));
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
            });
            setReport(reportData);
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل في جلب بيانات التقرير.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        if (defaultAccountId) {
            handleSubmit(handleGenerateReport)();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAccountId]);
    
    const getTransactionTypeName = (txType: string) => {
      const allTransactionTypes = [
          ...allFilters,
          { id: 'journal_from_installment', label: 'دفعة قسط اشتراك' }
      ];
      return allTransactionTypes.find(f => f.label === txType)?.id || txType;
    };
    
    const filteredTransactions = useMemo(() => {
        if (!report) return [];
        if (typeFilter.size === allFilters.length) return report.transactions;
        return report.transactions.filter(tx => typeFilter.has(getTransactionTypeName(tx.type)));
    }, [report, typeFilter, allFilters]);
    
    const handleFilterChange = (filterId: string, checked: boolean) => {
        setTypeFilter(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(filterId); else newSet.delete(filterId);
            return newSet;
        });
    };
    
    const handleSelectAllGlobal = (checked: boolean) => {
        if (checked) setTypeFilter(new Set(allFilters.map(f => f.id)));
        else setTypeFilter(new Set());
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
                            <Tabs defaultValue="filters">
                                <TabsList className="grid w-full grid-cols-2">
                                     <TabsTrigger value="filters"><Filter className="me-2 h-4 w-4"/>الفلاتر</TabsTrigger>
                                     <TabsTrigger value="options"><SlidersHorizontal className="me-2 h-4 w-4"/>الخيارات</TabsTrigger>
                                </TabsList>
                                <TabsContent value="filters" className="mt-4">
                                     <div className="flex items-center justify-between mb-2">
                                        <Label className="font-bold">فلترة الحركات</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="select-all-filters" checked={isAllSelected} onCheckedChange={(c) => handleSelectAllGlobal(!!c)} />
                                            <Label htmlFor="select-all-filters" className="text-xs font-semibold">تحديد الكل</Label>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {allFilters.map(cat => (
                                            <div key={cat.id} className="flex items-center space-x-2 space-x-reverse">
                                                <Checkbox id={`filter-${cat.id}`} checked={typeFilter.has(cat.id)} onCheckedChange={(c) => handleFilterChange(cat.id, !!c)} />
                                                <Label htmlFor={`filter-${cat.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">{cat.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="options" className="mt-4 space-y-4">
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
                                            <Controller name="dateRange" control={control} render={({ field }) => (
                                                <Popover><PopoverTrigger asChild><Button id="date-from" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}><CalendarIcon className="me-2 h-4 w-4" />{field.value?.from ? format(field.value.from, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="single" selected={field.value?.from} onSelect={(day) => field.onChange({ ...field.value, from: day })} /></PopoverContent></Popover>
                                            )}/>
                                        </div>
                                        <div className="space-y-1.5"><Label>إلى تاريخ</Label>
                                            <Controller name="dateRange" control={control} render={({ field }) => (
                                                <Popover><PopoverTrigger asChild><Button id="date-to" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.to && "text-muted-foreground")}><CalendarIcon className="me-2 h-4 w-4" />{field.value?.to ? format(field.value.to, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar initialFocus mode="single" selected={field.value?.to} onSelect={(day) => field.onChange({ ...field.value, to: day })} /></PopoverContent></Popover>
                                            )}/>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <Button size="lg" type="submit" disabled={isLoading || !watch('accountId')} className="w-full mt-6">
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
                                    <DropdownMenuTrigger asChild><Button variant="outline" disabled={!report}><Download className="me-2 h-4 w-4"/> التصدير والطباعة</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => {}}><FileSpreadsheet className="me-2 h-4 w-4 text-green-600"/> تصدير Excel</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {}}><Printer className="me-2 h-4 w-4 text-red-600"/> طباعة PDF</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                <TableRow><TableCell colSpan={11} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                            ) : filteredTransactions.map((tx, index) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{isValid(parseISO(tx.date)) ? format(parseISO(tx.date), 'yyyy-MM-dd HH:mm') : tx.date}</TableCell>
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
                                 <TableRow><TableCell colSpan={11} className="h-24 text-center">لا توجد حركات لهذه الفترة أو الفلاتر المطبقة.</TableCell></TableRow>
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
