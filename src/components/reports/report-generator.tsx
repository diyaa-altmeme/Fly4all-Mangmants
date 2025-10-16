
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { AlertTriangle, CalendarIcon, FileText, BarChart, Download, Loader2, Search, Filter, Printer, SlidersHorizontal, ChevronsRightLeft, Repeat, ListChecks, BookUser, Banknote, FileUp, FileDown, GitBranch, Plane, Layers3, Share2, Wand2, AreaChart, Wallet, Boxes, ArrowUp, ArrowDown, HandCoins, XCircle, CreditCard } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
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
import ReportSummary from '@/app/reports/account-statement/components/report-summary';
import ReportTable from '@/app/reports/account-statement/components/report-table';
import ReportFilters from '@/app/reports/account-statement/components/report-filters';
import { useAuth } from '@/lib/auth-context';

export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId }: { boxes: Box[], clients: Client[], suppliers: Supplier[], defaultAccountId?: string }) {
    
    const [report, setReport] = useState<ReportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [currentFilters, setCurrentFilters] = useState<any>(null);
    const { hasPermission } = useAuth();
    
    const allAccounts = useMemo(() => {
        const clientOptions = clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
        const supplierOptions = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
        const boxOptions = boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}` }));
        const exchangeOptions: { value: string, label: string }[] = []; // Assuming exchanges are not passed, add later if needed
        const staticAccounts = [
            { value: 'revenue_segments', label: 'إيراد: السكمنت'},
            { value: 'revenue_profit_distribution', label: 'إيراد: توزيع الأرباح'},
        ]
        
        return [...clientOptions, ...supplierOptions, ...boxOptions, ...exchangeOptions, ...staticAccounts];
    }, [clients, suppliers, boxes]);
    
    const allFilters = [
        { id: 'booking', label: 'حجز طيران', icon: Plane },
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


    const handleGenerateReport = useCallback(async (filters: any) => {
        if (!filters.accountId) {
            toast({ title: 'مدخلات غير كاملة', description: 'الرجاء اختيار حساب صحيح.', variant: 'destructive', });
            return;
        }

        setIsLoading(true);
        setReport(null);
        setCurrentFilters(filters);
        try {
            const reportData = await getAccountStatement({
                accountId: filters.accountId,
                currency: filters.currency,
                dateRange: { from: filters.dateRange?.from, to: filters.dateRange?.to },
                reportType: filters.reportType,
            });
            
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
    }, [toast, allFilters]);
    
     React.useEffect(() => {
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
    
    const handleExport = () => {
        if (!report || report.transactions.length === 0) {
            toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
            return;
        }

        const dataToExport = report.transactions.map(tx => ({
            "التاريخ": tx.date ? format(parseISO(tx.date), 'yyyy-MM-dd') : '',
            "النوع": tx.type,
            "البيان": typeof tx.description === 'string' ? tx.description : (tx.description as StructuredDescription).title,
            "مدين": tx.debit,
            "دائن": tx.credit,
            "الرصيد": tx.balance,
            "العملة": tx.currency,
            "الموظف": tx.officer,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Account Statement");
        
        const accountName = allAccounts.find(a => a.value === report.title.split(': ')[1])?.label || 'Account';
        XLSX.writeFile(workbook, `Statement-${accountName}-${new Date().toISOString().split('T')[0]}.xlsx`);
        
        toast({ title: "تم تصدير الكشف بنجاح" });
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="h-[calc(100vh-180px)] flex flex-row-reverse items-stretch">
             <aside className="w-80 border-l p-4 overflow-y-auto bg-card shrink-0">
                 <h3 className="text-lg font-bold mb-4">الملخص المالي</h3>
                 {report ? <ReportSummary report={report} /> : (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <BarChart size={48} className="text-gray-300"/>
                        <p className="mt-2">لم يتم إنشاء تقرير بعد.</p>
                     </div>
                 )}
            </aside>
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{report?.title || "كشف الحساب"}</CardTitle>
                            <CardDescription>
                                {report ? `يعرض ${report.transactions.length} حركة للفترة المحددة.` : 'اختر حسابًا لعرض كشف الحساب.'}
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}><Download className="me-2 h-4 w-4"/> تصدير Excel</Button>
                            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!report}><Printer className="me-2 h-4 w-4"/> طباعة</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg overflow-x-auto bg-card">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : report ? (
                                <ReportTable transactions={report.transactions} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-96 text-center text-gray-500">
                                   <FileText size={48} className="text-gray-300" />
                                   <p className="text-lg font-medium mt-4">لا يوجد تقرير لعرضه</p>
                                   <p className="text-sm">الرجاء اختيار حساب وتحديد فترة زمنية ثم الضغط على "عرض الكشف".</p>
                               </div>
                            )}
                         </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

    