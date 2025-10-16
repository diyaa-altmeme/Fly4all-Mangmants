
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Filter, FileText, Download, Printer } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useToast } from "@/hooks/use-toast";
import { getAccountStatement } from "@/app/reports/actions";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import ReportTable from "@/app/reports/account-statement/components/report-table";
import ReportFilters from "@/app/reports/account-statement/components/report-filters";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";
import type { Box, Client, Supplier, ReportInfo, Currency, StructuredDescription } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronsRightLeft, Repeat, ListChecks, BookUser, Banknote, FileUp, FileDown, GitBranch, Plane, Layers3, Share2, Wand2, AreaChart, Wallet, Boxes, ArrowUp, ArrowDown, HandCoins, XCircle, CreditCard, RefreshCw } from 'lucide-react';


interface ReportGeneratorProps {
  boxes: Box[];
  clients: Client[];
  suppliers: Supplier[];
  defaultAccountId?: string;
}

export default function ReportGenerator({ boxes, clients, suppliers, defaultAccountId }: ReportGeneratorProps) {
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [accountId, setAccountId] = useState(defaultAccountId || "");

  const [filters, setFilters] = useState({
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
  ], []);

  const getTransactionTypeName = (txType: string) => {
      const allTransactionTypes = [
          ...allFilters,
          { id: 'journal_from_installment', label: 'دفعة قسط اشتراك' }
      ];
      return allTransactionTypes.find(f => f.label === txType)?.id || txType;
  };

  const handleGenerateReport = useCallback(async () => {
    if (!accountId) {
      toast({ title: "خطأ", description: "الرجاء اختيار حساب.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReport(null);

    try {
      const reportData = await getAccountStatement({
        accountId: accountId,
        currency: filters.currency,
        dateRange: date || { from: undefined, to: undefined },
        reportType: filters.reportType,
      });

      if (filters.typeFilter.size > 0 && filters.typeFilter.size < allFilters.length) {
          reportData.transactions = reportData.transactions.filter(tx => {
               const transactionTypeName = getTransactionTypeName(tx.type);
               return filters.typeFilter.has(transactionTypeName);
          });
      }
      
      setReport(reportData);
    } catch (error: any) {
      toast({ title: "فشل", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, date, allFilters, toast]);

  useEffect(() => {
    if (defaultAccountId) {
      setAccountId(defaultAccountId);
      handleGenerateReport();
    }
  }, [defaultAccountId, handleGenerateReport]);
  
  const filteredTransactions = useMemo(() => {
      if (!report) return [];
      if (!filters.searchTerm) return report.transactions;

      const lowercasedTerm = filters.searchTerm.toLowerCase();
      return report.transactions.filter(tx => {
          return (
              tx.invoiceNumber?.toLowerCase().includes(lowercasedTerm) ||
              tx.type.toLowerCase().includes(lowercasedTerm) ||
              (typeof tx.description === 'string' 
                ? tx.description.toLowerCase().includes(lowercasedTerm)
                : (tx.description as StructuredDescription).title.toLowerCase().includes(lowercasedTerm)
              ) ||
              tx.officer?.toLowerCase().includes(lowercasedTerm)
          );
      });
  }, [report, filters.searchTerm]);

  const handleExport = () => {
    if (!report || filteredTransactions.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const data = filteredTransactions.map(tx => ({
      التاريخ: tx.date ? format(parseISO(tx.date), "yyyy-MM-dd") : "",
      النوع: tx.type,
      البيان: typeof tx.description === 'string' ? tx.description : (tx.description as StructuredDescription).title,
      مدين: tx.debit,
      دائن: tx.credit,
      الرصيد: tx.balance,
      العملة: tx.currency,
      الموظف: tx.officer,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف الحساب");
    const accountName = allAccounts.find(a => a.value === accountId)?.label || "Account";
    XLSX.writeFile(wb, `Statement-${accountName.replace(/:/g, '')}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "تم التصدير بنجاح" });
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex h-[calc(100vh-230px)] gap-4">
      {/* Right Sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="space-y-2">
          <Label className="font-semibold">الحساب</Label>
          <Autocomplete
            value={accountId}
            onValueChange={v => setAccountId(v)}
            options={allAccounts}
            placeholder="اختر حسابًا..."
          />
        </div>
        <div className="flex-grow overflow-y-auto -mx-4 px-4">
            <ReportFilters filters={filters} onFiltersChange={setFilters} allFilters={allFilters} />
        </div>
        <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full mt-auto">
          {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          <Filter className="me-2 h-4 w-4" />
          عرض الكشف
        </Button>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-card rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 p-3 border-b flex items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في نتائج الكشف..."
              value={filters.searchTerm}
              onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              className="pr-10 h-10"
            />
          </div>
           <Popover>
              <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className="w-[260px] justify-start text-right font-normal h-10 mx-2">
                      <CalendarIcon className="ms-2 h-4 w-4" />
                      {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>اختر فترة</span>)}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
              </PopoverContent>
          </Popover>
        </header>

        {/* Table */}
        <div className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : report ? (
            <ReportTable transactions={filteredTransactions} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
              <FileText size={48} className="text-gray-300" />
              <p className="text-lg font-medium mt-4">لا يوجد تقرير لعرضه</p>
              <p className="text-sm mt-1">اختر الحساب والفترة ثم اضغط "عرض الكشف".</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <footer className="flex-shrink-0 p-3 border-t bg-card flex items-center justify-between">
            <div className="flex gap-2">
                 <Button onClick={handleExport} variant="secondary" size="sm">تصدير Excel</Button>
                 <Button onClick={handlePrint} variant="secondary" size="sm">طباعة</Button>
            </div>
            {report ? <ReportSummary report={report} /> : <p className="text-center text-muted-foreground text-sm">لم يتم إنشاء تقرير بعد.</p>}
        </footer>
      </main>

    </div>
  );
}
