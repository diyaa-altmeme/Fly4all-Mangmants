
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Filter, FileText, Download, Printer, Plane, CreditCard, Repeat, Layers3, Share2, Wand2, AreaChart, Wallet, Boxes, FileUp, FileDown, BookUser, XCircle, RefreshCw, Banknote, GitBranch, ArrowRightLeft } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useToast } from "@/hooks/use-toast";
import { getAccountStatement } from "@/app/reports/actions";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import ReportTable from "@/app/reports/account-statement/components/report-table";
import ReportFilters from "@/app/reports/account-statement/components/report-filters";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";
import type { Box, Client, Supplier, ReportInfo, Currency } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';

interface ReportGeneratorProps {
  boxes: Box[];
  clients: Client[];
  suppliers: Supplier[];
  defaultAccountId?: string;
}

export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId }: ReportGeneratorProps) {
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [filters, setFilters] = useState({
    accountId: defaultAccountId || "",
    dateRange: { from: subDays(new Date(), 30), to: new Date() } as DateRange | undefined,
    searchTerm: "",
    currency: "both" as Currency | "both",
    reportType: "summary" as "summary" | "detailed",
    typeFilter: new Set<string>(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const allAccounts = useMemo(() => {
    const clientOptions = clients.map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
    const supplierOptions = suppliers.map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
    const boxOptions = boxes.map(b => ({ value: b.id, label: `صندوق: ${b.name}` }));
    const staticAccounts = [
      { value: "revenue_segments", label: "إيراد: السكمنت" },
      { value: "revenue_profit_distribution", label: "إيراد: توزيع الأرباح" },
    ];
    return [...clientOptions, ...supplierOptions, ...boxOptions, ...staticAccounts];
  }, [clients, suppliers, boxes]);

   const allFilters = useMemo(() => [
        { id: 'booking', label: 'حجز طيران', icon: Plane, group: 'basic' },
        { id: 'visa', label: 'طلب فيزا', icon: CreditCard, group: 'basic' },
        { id: 'subscription', label: 'اشتراك', icon: Repeat, group: 'basic' },
        { id: 'journal_from_payment', label: 'سند دفع', icon: FileUp, group: 'basic' },
        { id: 'journal_from_standard_receipt', label: 'سند قبض', icon: FileDown, group: 'basic' },
        { id: 'journal_from_expense', label: 'سند مصاريف', icon: Banknote, group: 'basic' },
        { id: 'journal_from_distributed_receipt', label: 'سند قبض مخصص', icon: GitBranch, group: 'other' },
        { id: 'journal_from_remittance', label: 'حوالة مستلمة', icon: ArrowRightLeft, group: 'other' },
        { id: 'segment', label: 'سكمنت', icon: Layers3, group: 'other' },
        { id: 'profit_distribution', label: 'توزيع الحصص', icon: Share2, group: 'other' },
        { id: 'journal_voucher', label: 'قيد محاسبي', icon: BookUser, group: 'other' },
        { id: 'refund', label: 'استرجاع تذكرة', icon: RefreshCw, group: 'other' },
        { id: 'exchange', label: 'تغيير تذكرة', icon: RefreshCw, group: 'other' },
        { id: 'void', label: 'إلغاء (فويد)', icon: XCircle, group: 'other' },
    ], []);
    
    useEffect(() => {
        setFilters(f => ({ ...f, typeFilter: new Set(allFilters.map(filter => filter.id)) }));
    }, [allFilters]);

  const handleGenerateReport = useCallback(async () => {
    if (!filters.accountId) {
      toast({ title: "خطأ", description: "الرجاء اختيار حساب.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReport(null);

    try {
      const reportData = await getAccountStatement({
        accountId: filters.accountId,
        currency: filters.currency,
        dateRange: filters.dateRange || { from: undefined, to: undefined },
        reportType: filters.reportType,
        typeFilter: Array.from(filters.typeFilter),
      });
      setReport(reportData);
    } catch (error: any) {
      toast({ title: "فشل", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    if (defaultAccountId) {
        handleGenerateReport();
    }
  }, [defaultAccountId, handleGenerateReport]);


  const handleExport = () => {
    if (!report || report.transactions.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const data = report.transactions.map(tx => ({
      'التاريخ': tx.date ? format(parseISO(tx.date), "yyyy-MM-dd") : "",
      'النوع': tx.type,
      'البيان': typeof tx.description === 'string' ? tx.description : tx.description?.title,
      'مدين': tx.debit,
      'دائن': tx.credit,
      'الرصيد': tx.balance,
      'العملة': tx.currency,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف الحساب");
    const accountName = allAccounts.find(a => a.value === filters.accountId)?.label || "Account";
    XLSX.writeFile(wb, `Statement-${accountName.replace(/:/g, '')}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "تم التصدير بنجاح" });
  };

  const handlePrint = () => window.print();

  return (
     <div className="flex h-[calc(100vh-220px)] flex-row-reverse gap-4">
      <main className="flex-1 flex flex-col bg-card rounded-lg shadow-sm overflow-hidden">
        <header className="flex items-center justify-between p-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في النتائج..."
              value={filters.searchTerm}
              onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              className="ps-10 h-9"
            />
          </div>
        </header>
        <div className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : report ? (
            <ReportTable transactions={report.transactions} reportType={filters.reportType} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
              <FileText size={48} className="text-gray-300" />
              <p className="text-lg font-medium mt-4">لا يوجد تقرير لعرضه</p>
              <p className="text-sm mt-1">اختر الحساب والفترة ثم اضغط "عرض الكشف".</p>
            </div>
          )}
        </div>
      </main>

      <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="flex-grow flex flex-col gap-4 overflow-y-auto">
            <Card>
                <CardHeader>
                    <CardTitle>خيارات العرض</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="font-semibold">الحساب</Label>
                        <Autocomplete
                            value={filters.accountId}
                            onValueChange={v => setFilters(f => ({ ...f, accountId: v }))}
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
                                !filters.dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateRange?.from ? (
                                filters.dateRange.to ? (
                                    <>
                                    {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                    {format(filters.dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(filters.dateRange.from, "LLL dd, y")
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
                                defaultMonth={filters.dateRange?.from}
                                selected={filters.dateRange}
                                onSelect={d => setFilters(f => ({...f, dateRange: d}))}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full">
                        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Filter className="me-2 h-4 w-4" />
                        عرض الكشف
                    </Button>
                </CardContent>
            </Card>
            <Card className="flex-grow flex flex-col">
              <CardHeader>
                <CardTitle>فلترة الحركات</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto pr-2 -mr-2">
                  <ReportFilters filters={filters} onFiltersChange={setFilters} allFilters={allFilters} />
              </CardContent>
            </Card>
        </div>
      </aside>

        <footer className="fixed bottom-0 right-0 left-0 flex-shrink-0 p-3 border-t bg-card grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-center shadow-lg z-20">
             {report ? <ReportSummary report={report} /> : <div className="text-center text-muted-foreground text-sm col-span-1 py-6">لم يتم إنشاء تقرير بعد.</div>}
             <div className="flex gap-2">
                <Button onClick={handleExport} variant="secondary" disabled={!report}><Download className="me-2 h-4 w-4"/>Excel</Button>
                <Button onClick={handlePrint} variant="secondary" disabled={!report}><Printer className="me-2 h-4 w-4"/>طباعة</Button>
            </div>
        </footer>
    </div>
  );
}
