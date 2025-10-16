
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Search, Filter, ArrowDown, ArrowUp, HandCoins, ListTree, FilePenLine, ChevronDown, FileSpreadsheet, FileBarChart, BookOpen, Book, SlidersHorizontal, Printer, Ticket, RefreshCw, Briefcase, BedDouble, Users as UsersIcon, Shield, Train, Settings, CreditCard, Wallet, GitBranch, Banknote, BookUser, FileDown, FileUp, ArrowRightLeft, Repeat, XCircle, CheckCheck, Undo, Loader2 } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import type { Currency, ReportTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

interface ReportFiltersProps {
    allAccounts: { value: string, label: string }[];
    allFilters: { id: string, label: string, icon: React.ElementType }[];
    onGenerateReport: (filters: any) => void;
    isLoading: boolean;
    defaultAccountId?: string;
}

export default function ReportFilters({ allAccounts, allFilters, onGenerateReport, isLoading, defaultAccountId }: ReportFiltersProps) {
    const [accountId, setAccountId] = useState(defaultAccountId || '');
    const [currency, setCurrency] = useState<Currency | 'both'>('both');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
    const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set(allFilters.map(f => f.id)));
    
    const handleFilterToggle = (id: string) => {
        setTypeFilter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => setTypeFilter(new Set(allFilters.map(f => f.id)));
    const handleDeselectAll = () => setTypeFilter(new Set());
    
    const handleSubmit = () => {
        onGenerateReport({ accountId, currency, dateRange, reportType, typeFilter: Array.from(typeFilter) });
    };

    return (
        <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-purple-900/20">
                <CardTitle>فلاتر كشف الحساب</CardTitle>
                <CardDescription>حدد المعايير لعرض الكشف المطلوب.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                    <Label className="font-semibold">تحديد الحساب</Label>
                    <Autocomplete
                        value={accountId}
                        onValueChange={setAccountId}
                        options={allAccounts}
                        placeholder="اختر حسابًا..."
                    />
                </div>
                 <div className="space-y-2">
                    <Label className="font-semibold">الفترة الزمنية</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="me-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>اختر فترة</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">خيارات</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="both">كل العملات</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="IQD">IQD</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="summary">موجز</SelectItem>
                                <SelectItem value="detailed">مفصل</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="font-semibold">فلترة الحركات</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><SlidersHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={handleSelectAll}><CheckCheck className="me-2 h-4 w-4"/> تحديد الكل</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDeselectAll}><Undo className="me-2 h-4 w-4"/>إلغاء تحديد الكل</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {allFilters.map((type) => {
                            const Icon = type.icon;
                            return (
                                <div key={type.id} className="flex items-center space-x-2 space-x-reverse rounded-md border p-2 bg-background">
                                    <Checkbox
                                        id={type.id}
                                        checked={typeFilter.has(type.id)}
                                        onCheckedChange={() => handleFilterToggle(type.id)}
                                    />
                                    <Label htmlFor={type.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                                        <Icon className="h-3 w-3 text-muted-foreground"/> {type.label}
                                    </Label>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                    {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                    <Filter className="me-2 h-4 w-4"/>
                    عرض الكشف
                </Button>
            </CardFooter>
        </Card>
    );
}
