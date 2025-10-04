

"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Loader2, Search, Filter, ArrowDown, ArrowUp, HandCoins, ListTree, FilePenLine, ChevronDown, FileSpreadsheet, FileBarChart, BookOpen, Book } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import type { Box, ReportInfo, ReportTransaction, Currency, AccountType, Client, Supplier, StructuredDescription } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getAccountStatement } from '../actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Controller, useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const formatCurrencyDisplay = (amount: number, currency: string) => {
    const formattedAmount = new Intl.NumberFormat('en-US').format(Math.abs(amount));
    return `${amount < 0 ? `(${formattedAmount})` : formattedAmount} ${currency}`;
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


export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId, transactionType }: { boxes: Box[], clients: Client[], suppliers: Supplier[], defaultAccountId?: string, transactionType?: 'profits' | 'expenses' }) {
    
    const [report, setReport] = useState<ReportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    
    const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

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
            toast({
                title: 'مدخلات غير كاملة',
                description: 'الرجاء اختيار حساب صحيح.',
                variant: 'destructive',
            });
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
            toast({
                title: 'خطأ',
                description: 'فشل في جلب بيانات التقرير.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, transactionType]);
    
     const transactionTypes = useMemo(() => {
        if (!report) return [];
        const types = new Set(report.transactions.map(tx => tx.type));
        return Array.from(types).map(type => ({ value: type, label: type }));
    }, [report]);

    const filteredTransactions = useMemo(() => {
        if (!report) return [];
        if (typeFilter.size === 0) return report.transactions;
        return report.transactions.filter(tx => typeFilter.has(tx.type));
    }, [report, typeFilter]);

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
                'التاريخ': format(new Date(tx.date), 'yyyy-MM-dd HH:mm'),
                'نوع الحركة': tx.type,
                'رقم السند': tx.invoiceNumber,
                'البيان': description,
                'مدين': tx.debit,
                'دائن': tx.credit,
                'الرصيد': tx.balance,
                'العملة': tx.currency,
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
    
    // Auto-generate report if defaultAccountId is provided
    useEffect(() => {
        if (defaultAccountId) {
            handleGenerateReport(watch());
        }
    }, [defaultAccountId, watch, handleGenerateReport]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <form onSubmit={handleSubmit(handleGenerateReport)}>
                 <CardHeader>
                    <div className="flex w-full flex-col items-start gap-4">
                        <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1.5 lg:col-span-2"><Label>اسم الحساب</Label>
                                <Controller
                                    name="accountId"
                                    control={control}
                                    render={({ field }) => (
                                         <Autocomplete
                                            value={field.value}
                                            onValueChange={(v) => { field.onChange(v); setReport(null); }}
                                            options={accountOptions}
                                            placeholder="ابحث عن حساب (عميل, مورد, صندوق)..."
                                            disabled={!!defaultAccountId}
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex gap-2 self-end w-full">
                                <Button type="submit" disabled={isLoading || !watch('accountId')} className="w-full">
                                    {isLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin"/> جاري العرض...</> : <><Search className="me-2 h-4 w-4"/>عرض</>}
                                </Button>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" disabled={!report}>
                                            <Download className="h-4 w-4"/>
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
                            </div>
                        </div>
                         <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                     <div className="space-y-1.5"><Label>العملة</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="both">كل العملات</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IQD">IQD</SelectItem></SelectContent></Select></div>
                                )}
                            />
                             <Controller
                                name="reportType"
                                control={control}
                                render={({ field }) => (
                                     <div className="space-y-1.5"><Label>نوع الكشف</Label><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                                        <SelectItem value="summary"><div className="flex items-center gap-2"><Book className="h-4 w-4"/><span>كشف مختصر</span></div></SelectItem>
                                        <SelectItem value="detailed"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4"/><span>كشف تفصيلي</span></div></SelectItem>
                                     </SelectContent></Select></div>
                                )}
                            />
                            <Controller
                                name="dateRange"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        <div className="space-y-1.5"><Label>من تاريخ</Label><Popover><PopoverTrigger asChild><Button id="date-from" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}><CalendarIcon className="me-2 h-4 w-4" />{field.value?.from ? format(field.value.from, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={field.value} onSelect={field.onChange} numberOfMonths={2} /></PopoverContent></Popover></div>
                                        <div className="space-y-1.5"><Label>إلى تاريخ</Label><Popover><PopoverTrigger asChild><Button id="date-to" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.to && "text-muted-foreground")}><CalendarIcon className="me-2 h-4 w-4" />{field.value?.to ? format(field.value.to, "yyyy-MM-dd") : <span>اختر تاريخاً</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={field.value} onSelect={field.onChange} numberOfMonths={2} /></PopoverContent></Popover></div>
                                    </>
                                )}
                            />
                         </div>
                    </div>
                </CardHeader>
                </form>

                <CardContent>
                    <div className="flex justify-end mb-4">
                         {report && (
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8">
                                        <Filter className="me-2 h-4 w-4"/>
                                        فلترة النوع
                                        {typeFilter.size > 0 && <Badge className="ms-2">{typeFilter.size}</Badge>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="ابحث عن النوع..." />
                                        <CommandList>
                                            <CommandEmpty>لا توجد نتائج.</CommandEmpty>
                                            <CommandGroup>
                                                {transactionTypes.map((type) => {
                                                    const isSelected = typeFilter.has(type.value);
                                                    return (
                                                        <CommandItem
                                                        key={type.value}
                                                        onSelect={() => {
                                                            setTypeFilter(prev => {
                                                                const newSet = new Set(prev);
                                                                if (isSelected) {
                                                                    newSet.delete(type.value);
                                                                } else {
                                                                    newSet.add(type.value);
                                                                }
                                                                return newSet;
                                                            });
                                                        }}
                                                        >
                                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        <span>{type.label}</span>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : !report ? (
                         !defaultAccountId && (
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">
                                    الرجاء اختيار حساب وتحديد الفترة لعرض النتائج.
                                </p>
                            </div>
                         )
                    ) : (
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">#</TableHead>
                                        <TableHead className="text-center">التاريخ</TableHead>
                                        <TableHead className="text-center">نوع الحركة</TableHead>
                                        <TableHead className="text-center">رقم السند</TableHead>
                                        <TableHead className="text-right w-[30%]">البيان</TableHead>
                                        <TableHead className="text-center">العملة</TableHead>
                                        <TableHead className="text-center text-red-600">مدين</TableHead>
                                        <TableHead className="text-center text-green-600">دائن</TableHead>
                                        <TableHead className="text-center">الرصيد</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-right font-semibold">رصيد افتتاحي</TableCell>
                                        <TableCell className="text-center font-mono">
                                             {report.currency === 'both' || report.currency === 'USD' ? <div>{formatCurrencyDisplay(report.openingBalanceUSD || 0, 'USD')}</div> : null}
                                             {report.currency === 'both' || report.currency === 'IQD' ? <div>{formatCurrencyDisplay(report.openingBalanceIQD || 0, 'IQD')}</div> : null}
                                        </TableCell>
                                    </TableRow>
                                    {filteredTransactions.map((tx, index) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-center">{index + 1}</TableCell>
                                            <TableCell className="font-mono text-xs text-center">
                                                <div>{format(new Date(tx.date), 'yyyy-MM-dd HH:mm')}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{tx.type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-center">{tx.invoiceNumber}</TableCell>
                                            <TableCell className="text-right">
                                                {typeof tx.description === 'string' ? (
                                                    <span className="whitespace-pre-wrap">{tx.description}</span>
                                                ) : (
                                                    <StructuredDescriptionDisplay data={tx.description} isDetailed={watch('reportType') === 'detailed'} />
                                                )}
                                            </TableCell>
                                             <TableCell className="text-center font-mono">{tx.currency}</TableCell>
                                            <TableCell className="text-center font-mono text-red-600">{tx.debit > 0 ? `${formatCurrencyDisplay(tx.debit, '')}` : '-'}</TableCell>
                                            <TableCell className="text-center font-mono text-green-600">{tx.credit > 0 ? `${formatCurrencyDisplay(tx.credit, '')}` : '-'}</TableCell>
                                            <TableCell className="text-center font-mono">{formatCurrencyDisplay(tx.balance, tx.currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             {filteredTransactions.length === 0 && (
                                 <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                                    <p className="mt-4 text-muted-foreground">
                                        لا توجد معاملات لهذه الفترة أو حسب الفلتر المطبق.
                                    </p>
                                </div>
                            )}
                         </div>
                    )}
                </CardContent>
                 {report && (
                    <CardFooter className="justify-between pt-4 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">إجمالي المدين</p>
                                { (report.totalDebitUSD || 0) > 0 && <p className="font-bold font-mono text-red-600">{formatCurrencyDisplay(report.totalDebitUSD || 0, 'USD')}</p>}
                                { (report.totalDebitIQD || 0) > 0 && <p className="font-bold font-mono text-red-600">{formatCurrencyDisplay(report.totalDebitIQD || 0, 'IQD')}</p>}
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
                                { (report.totalCreditUSD || 0) > 0 && <p className="font-bold font-mono text-green-600">{formatCurrencyDisplay(report.totalCreditUSD || 0, 'USD')}</p>}
                                { (report.totalCreditIQD || 0) > 0 && <p className="font-bold font-mono text-green-600">{formatCurrencyDisplay(report.totalCreditIQD || 0, 'IQD')}</p>}
                            </div>
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <p className="text-sm text-primary">الرصيد الختامي USD</p>
                                <p className="font-bold font-mono text-primary">{formatCurrencyDisplay(report.finalBalanceUSD || 0, 'USD')}</p>
                            </div>
                             <div className="p-3 bg-primary/10 rounded-lg">
                                <p className="text-sm text-primary">الرصيد الختامي IQD</p>
                                <p className="font-bold font-mono text-primary">{formatCurrencyDisplay(report.finalBalanceIQD || 0, 'IQD')}</p>
                            </div>
                        </div>
                    </CardFooter>
                 )}
            </Card>
        </div>
    );
}
