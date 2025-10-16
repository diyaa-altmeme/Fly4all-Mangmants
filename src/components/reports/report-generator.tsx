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
import ReportSummary from '@/components/reports/report-summary';
import ReportTable from '@/components/reports/report-table';
import ReportFilters from '@/components/reports/report-filters';

export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId }: { boxes: Box[], clients: Client[], suppliers: Supplier[], defaultAccountId?: string }) {
    
    const [report, setReport] = useState<ReportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    
    const allAccounts = useMemo(() => {
        const clientOptions = clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
        const supplierOptions = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
        const boxOptions = boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}` }));
        const exchangeOptions: { value: string, label: string }[] = []; // Assuming exchanges are not passed, add later if needed
        
        return [...clientOptions, ...supplierOptions, ...boxOptions, ...exchangeOptions];
    }, [clients, suppliers, boxes]);

    const handleGenerateReport = useCallback(async (filters: any) => {
        if (!filters.accountId) {
            toast({ title: 'مدخلات غير كاملة', description: 'الرجاء اختيار حساب صحيح.', variant: 'destructive', });
            return;
        }

        setIsLoading(true);
        setReport(null);
        try {
            const reportData = await getAccountStatement({
                accountId: filters.accountId,
                currency: filters.currency,
                dateRange: { from: filters.dateRange?.from, to: filters.dateRange?.to },
                reportType: filters.reportType,
            });
            
            // Filter transactions after fetching
            const transactionTypeFilter = filters.typeFilter || new Set();
            if (transactionTypeFilter.size > 0 && transactionTypeFilter.size < allFilters.length) {
                reportData.transactions = reportData.transactions.filter(tx => {
                     const transactionTypeName = getTransactionTypeName(tx.type);
                     return transactionTypeFilter.has(transactionTypeName);
                });
            }

            setReport(reportData);
        } catch (error: any) {
            toast({ title: 'خطأ', description: `فشل في جلب بيانات التقرير: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
     useEffect(() => {
        if (defaultAccountId) {
            handleGenerateReport({
                accountId: defaultAccountId,
                currency: 'both',
                dateRange: { from: subDays(new Date(), 30), to: new Date() },
                reportType: 'summary',
                typeFilter: new Set(allFilters.map(f => f.id))
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAccountId]);
    
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

    const getTransactionTypeName = (txType: string) => {
      const allTransactionTypes = [
          ...allFilters,
          { id: 'journal_from_installment', label: 'دفعة قسط اشتراك' }
      ];
      return allTransactionTypes.find(f => f.label === txType)?.id || txType;
    };

    return (
        <div className="flex flex-col lg:flex-row-reverse gap-6 items-start">
            <aside className="sticky top-20 w-full lg:w-96 shrink-0">
                <ReportFilters 
                    allAccounts={allAccounts}
                    allFilters={allFilters}
                    onGenerateReport={handleGenerateReport}
                    isLoading={isLoading}
                    defaultAccountId={defaultAccountId}
                />
            </aside>
             <div className="space-y-6 w-full">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>كشف الحساب</CardTitle>
                                <CardDescription>عرض تفصيلي لجميع الحركات المالية المتعلقة بالحساب المحدد.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
                
                {report && <ReportSummary report={report} />}

                 <div className="border rounded-lg overflow-x-auto bg-card">
                     {!report && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-96 text-center text-gray-500">
                           <FileText size={48} className="text-gray-300" />
                           <p className="text-lg font-medium mt-4">لا يوجد تقرير لعرضه</p>
                           <p className="text-sm">الرجاء اختيار حساب وتحديد فترة زمنية ثم الضغط على "عرض الكشف".</p>
                       </div>
                    )}
                 </div>
            </div>
        </div>
    )
}
