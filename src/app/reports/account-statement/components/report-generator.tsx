
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Filter, FileText, Download, Printer, Plane, CreditCard, Repeat, Layers3, Share2, Wand2, AreaChart, Wallet, Boxes, FileUp, FileDown, BookUser, XCircle, RefreshCw, Banknote, GitBranch, ArrowRightLeft, ChevronsRightLeft, Building, Users, Terminal, Copy, TrendingUp, TrendingDown } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useToast } from "@/hooks/use-toast";
import { getAccountStatement } from "@/app/reports/actions";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import ReportTable from "@/app/reports/account-statement/components/report-table";
import ReportFilters from "@/app/reports/account-statement/components/report-filters";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";
import type { Box, Client, Supplier, ReportInfo, Currency, Exchange, ReportTransaction } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { mapVoucherLabel } from "@/lib/accounting/labels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportInsights from "./report-insights";
import ReportTimeline from "./report-timeline";
import { FormProvider, useForm } from "react-hook-form";
import type { NormalizedVoucherType } from "@/lib/accounting/voucher-types";
import { DEFAULT_VOUCHER_TABS_ORDER } from "@/lib/accounting/voucher-types";

interface ReportGeneratorProps {
  boxes?: Box[];
  clients?: Client[];
  suppliers?: Supplier[];
  exchanges?: Exchange[];
  defaultAccountId?: string;
}

type ReportFiltersState = {
  accountId: string;
  accountType: 'relation' | 'box' | 'exchange' | 'static' | 'expense';
  dateRange: DateRange | undefined;
  searchTerm: string;
  currency: Currency | "both";
  typeFilter: Set<string>;
  direction: "all" | "debit" | "credit";
  officer: "all" | string;
  minAmount: string;
  maxAmount: string;
  showOpeningBalance: boolean;
};

const FILTER_ICON_MAP: Partial<Record<NormalizedVoucherType, React.ElementType>> = {
  standard_receipt: FileDown,
  distributed_receipt: GitBranch,
  payment: FileUp,
  manualExpense: Banknote,
  journal_voucher: BookUser,
  remittance: ArrowRightLeft,
  transfer: Repeat,
  booking: Plane,
  visa: CreditCard,
  subscription: Repeat,
  segment: Layers3,
  'profit-sharing': Share2,
  refund: RefreshCw,
  exchange: ArrowRightLeft,
  exchange_transaction: ChevronsRightLeft,
  exchange_payment: CreditCard,
  exchange_adjustment: RefreshCw,
  exchange_revenue: TrendingUp,
  exchange_expense: TrendingDown,
  void: XCircle,
  other: Wand2,
};

const BASIC_FILTER_TYPES: NormalizedVoucherType[] = [
  'standard_receipt',
  'distributed_receipt',
  'payment',
  'manualExpense',
  'booking',
  'visa',
  'subscription',
  'journal_voucher',
];

const createDefaultDateRange = (): DateRange => ({
  from: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  to: endOfDay(new Date()),
});

const amountForTransaction = (tx: ReportTransaction): number => {
  if (typeof tx.amount === "number") return Math.abs(tx.amount);
  if (tx.debit && tx.debit > 0) return tx.debit;
  if (tx.credit && tx.credit > 0) return tx.credit;
  return Math.abs(tx.balance || 0);
};

export default function ReportGenerator({
  boxes = [],
  clients = [],
  suppliers = [],
  exchanges = [],
  defaultAccountId,
}: ReportGeneratorProps) {
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const { data: navData } = useVoucherNav();
  
  const allFilters = useMemo(
    () =>
      DEFAULT_VOUCHER_TABS_ORDER.map((type) => {
        const icon = FILTER_ICON_MAP[type] ?? Terminal;
        const group = BASIC_FILTER_TYPES.includes(type) ? 'basic' : 'other';
        return {
          id: type,
          label: mapVoucherLabel(type),
          icon,
          group,
        } as const;
      }),
    []
  );

  const formMethods = useForm<ReportFiltersState>({
    defaultValues: {
      accountId: defaultAccountId || "",
      accountType: 'relation',
      dateRange: createDefaultDateRange(),
      searchTerm: "",
      currency: "both",
      typeFilter: new Set<string>(allFilters.map(f => f.id)),
      direction: "all",
      officer: "all",
      minAmount: "",
      maxAmount: "",
      showOpeningBalance: true,
    }
  });
  const filters = formMethods.watch();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const firestoreIndexUrl =
    error && error.startsWith("FIRESTORE_INDEX_URL::")
      ? error.split("::")[1]
      : null;

  const allAccounts = useMemo(() => {
        const clientOptions = clients.map((c) => ({
          value: c.id,
          label: `عميل: ${c.name}`,
        }));
        const supplierOptions = suppliers.map((s) => ({
          value: s.id,
          label: `مورد: ${s.name}`,
        }));
        const boxOptions = boxes.map((b) => ({
          value: b.id,
          label: `صندوق: ${b.name}`,
        }));
        const exchangeOptions = exchanges.map((ex) => ({
          value: ex.id,
          label: `بورصة: ${ex.name}`,
        }));
        const staticAccounts = [
          { value: "revenue_segments", label: "إيراد: السكمنت" },
          { value: "revenue_profit_distribution", label: "إيراد: توزيع الأرباح" },
          { value: "revenue_tickets", label: "إيرادات التذاكر" },
          { value: "revenue_visa", label: "إيرادات الفيزا" },
          { value: "revenue_subscriptions", label: "إيراد: الاشتراكات" },
          { value: "expense_tickets", label: "تكلفة التذاكر" },
          { value: "expense_visa", label: "تكلفة الفيزا" },
          { value: "expense_subscriptions", label: "تكلفة الاشتراكات" },
          { value: "expense_partners", label: "مصروفات الشركاء" },
        ];
        return [...clientOptions, ...supplierOptions, ...boxOptions, ...exchangeOptions, ...staticAccounts];
  }, [clients, suppliers, boxes, exchanges]);

  const officerOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.officer) {
        set.add(tx.officer);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const currencyDisplayMetadata = useMemo(() => {
    const metadata: Record<string, { name?: string; symbol?: string }> = {};
    const settings = navData?.settings.currencySettings;
    if (settings?.currencies) {
      settings.currencies.forEach((currencySetting) => {
        metadata[currencySetting.code] = {
          name: currencySetting.name || currencySetting.code,
          symbol: currencySetting.symbol || currencySetting.code,
        };
      });
    }
    const fallback: Record<string, { name: string; symbol: string }> = {
      USD: { name: "الدولار الأمريكي", symbol: "USD" },
      IQD: { name: "الدينار العراقي", symbol: "IQD" },
    };
    Object.entries(fallback).forEach(([code, value]) => {
      if (!metadata[code]) {
        metadata[code] = value;
      }
    });
    return metadata;
  }, [navData]);

  const supportedCurrencies = useMemo(
    () => Object.keys(currencyDisplayMetadata),
    [currencyDisplayMetadata]
  );

  const currencyOptions = useMemo(
    () =>
      supportedCurrencies.map((code) => ({
        code,
        label: currencyDisplayMetadata[code]?.name || code,
        symbol: currencyDisplayMetadata[code]?.symbol,
      })),
    [supportedCurrencies, currencyDisplayMetadata]
  );
  
  const handleGenerateReport = useCallback(async () => {
    const currentFilters = formMethods.getValues();
    if (!currentFilters.accountId) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار حساب.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setTransactions([]);
    setReport(null);
    setError(null);
    
    const accountType = currentFilters.accountId.startsWith('expense_') ? 'expense'
      : currentFilters.accountId.startsWith('revenue_') ? 'revenue'
      : clients.some(c => c.id === currentFilters.accountId) ? 'relation'
      : suppliers.some(s => s.id === currentFilters.accountId) ? 'relation'
      : boxes.some(b => b.id === currentFilters.accountId) ? 'box'
      : exchanges.some(ex => ex.id === currentFilters.accountId) ? 'exchange'
      : 'static';
    
    const relationKind = clients.some(c => c.id === currentFilters.accountId) ? 'client' :
                         suppliers.some(s => s.id === currentFilters.accountId) ? 'supplier' : undefined;

    try {
      const selectedTypes = Array.from(currentFilters.typeFilter);
      const shouldFilterByType =
        selectedTypes.length > 0 && selectedTypes.length < allFilters.length;

      const { transactions: data, openingBalances: ob } = await getAccountStatement({
        accountId: currentFilters.accountId,
        dateFrom: currentFilters.dateRange?.from,
        dateTo: currentFilters.dateRange?.to,
        voucherType: shouldFilterByType ? selectedTypes : undefined,
        accountType,
        relationKind,
        includeDeleted: false,
      });

      setTransactions(data || []);

      const currencyMetadata: Record<string, { name?: string; symbol?: string }> = {};
      const allCurrencies = new Set<string>();
      
      navData?.settings?.currencySettings?.currencies.forEach(c => {
          currencyMetadata[c.code] = { name: c.name, symbol: c.symbol };
          allCurrencies.add(c.code);
      });
      
      data.forEach(tx => allCurrencies.add(tx.currency));

      const currencyBreakdown = Array.from(allCurrencies).map(code => {
          let balance = ob?.[code] || 0;
          const txsForCurrency = data.filter(tx => tx.currency === code);
          const totalDebit = txsForCurrency.reduce((sum, tx) => sum + (tx.debit || 0), 0);
          const totalCredit = txsForCurrency.reduce((sum, tx) => sum + (tx.credit || 0), 0);
          
          txsForCurrency.forEach(tx => {
              balance += (tx.debit || 0) - (tx.credit || 0);
          });

          return {
              currency: code,
              label: currencyMetadata[code]?.name || code,
              symbol: currencyMetadata[code]?.symbol || code,
              openingBalance: ob?.[code] || 0,
              totalDebit: totalDebit,
              totalCredit: totalCredit,
              finalBalance: balance,
          }
      });
      
      setReport({
        title: 'كشف حساب',
        transactions: data,
        openingBalanceUSD: ob?.USD || 0,
        openingBalanceIQD: ob?.IQD || 0,
        totalDebitUSD: currencyBreakdown.find(b => b.currency === 'USD')?.totalDebit || 0,
        totalCreditUSD: currencyBreakdown.find(b => b.currency === 'USD')?.totalCredit || 0,
        finalBalanceUSD: currencyBreakdown.find(b => b.currency === 'USD')?.finalBalance || 0,
        totalDebitIQD: currencyBreakdown.find(b => b.currency === 'IQD')?.totalDebit || 0,
        totalCreditIQD: currencyBreakdown.find(b => b.currency === 'IQD')?.totalCredit || 0,
        finalBalanceIQD: currencyBreakdown.find(b => b.currency === 'IQD')?.finalBalance || 0,
        currency: currentFilters.currency,
        accountType: 'asset',
        balanceMode: 'asset',
        currencyBreakdown
      });

      setLastRefreshedAt(new Date().toISOString());
    } catch (error: any) {
      setError(error.message);
      setTransactions([]);
      setReport(null);
      if (!error.message.startsWith("FIRESTORE_INDEX_URL::")) {
        toast({
          title: "فشل",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [formMethods, toast, clients, suppliers, boxes, exchanges, navData, allFilters]);

  useEffect(() => {
    if (defaultAccountId) {
      formMethods.setValue('accountId', defaultAccountId);
      handleGenerateReport();
    }
  }, [defaultAccountId, handleGenerateReport, formMethods]);

  const resetFilters = useCallback(() => {
    formMethods.reset({
      accountId: filters.accountId,
      accountType: 'relation',
      dateRange: createDefaultDateRange(),
      searchTerm: "",
      currency: "both",
      typeFilter: new Set<string>(allFilters.map((filter) => filter.id)),
      direction: "all",
      officer: "all",
      minAmount: "",
      maxAmount: "",
      showOpeningBalance: true,
    });
  }, [allFilters, formMethods, filters.accountId]);

  const filteredTransactions = useMemo(() => {
    const rawMin = filters.minAmount !== "" ? Number(filters.minAmount) : null;
    const rawMax = filters.maxAmount !== "" ? Number(filters.maxAmount) : null;
    const minAmount = rawMin !== null && Number.isFinite(rawMin) ? rawMin : null;
    const maxAmount = rawMax !== null && Number.isFinite(rawMax) ? rawMax : null;

    const shouldApplyTypeFilter =
      filters.typeFilter.size > 0 && filters.typeFilter.size < allFilters.length;

    return transactions.filter((tx) => {
      if (shouldApplyTypeFilter && !filters.typeFilter.has(tx.type)) {
        return false;
      }

      if (filters.currency !== "both" && tx.currency !== filters.currency) {
        return false;
      }

      if (filters.officer !== "all" && tx.officer !== filters.officer) {
        return false;
      }

      if (filters.direction === "debit" && !(tx.debit && tx.debit > 0)) {
        return false;
      }
      if (filters.direction === "credit" && !(tx.credit && tx.credit > 0)) {
        return false;
      }

      const amount = amountForTransaction(tx);
      if (minAmount !== null && amount < minAmount) {
        return false;
      }
      if (maxAmount !== null && amount > maxAmount) {
        return false;
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const descriptionText =
          typeof tx.description === "string"
            ? tx.description
            : `${tx.description?.title ?? ""} ${tx.description?.notes ?? ""}`;
        const matchesDescription = descriptionText
          ?.toLowerCase()
          .includes(term);
        const matchesInvoice = tx.invoiceNumber?.toLowerCase().includes(term);
        const matchesOfficer = tx.officer?.toLowerCase().includes(term ?? "");
        const matchesNotes = tx.notes?.toLowerCase().includes(term ?? "");

        if (!matchesDescription && !matchesInvoice && !matchesOfficer && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters, allFilters]);

  const finalTransactions = useMemo(() => {
    return filteredTransactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

  const handleExport = () => {
    if (!finalTransactions || finalTransactions.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const data = finalTransactions.map((tx) => ({
      'التاريخ': tx.date ? format(parseISO(tx.date), "yyyy-MM-dd") : "",
      'النوع': mapVoucherLabel(tx.sourceType || tx.voucherType || tx.type),
      'البيان': typeof tx.description === "string" ? tx.description : tx.description?.title,
      'مدين': tx.debit || 0,
      'دائن': tx.credit || 0,
      'الرصيد': tx.balancesByCurrency?.[tx.currency] ?? tx.balance ?? 0,
      'العملة': tx.currency,
      'الموظف': tx.officer || "",
      'الملاحظات': tx.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف الحساب");
    const accountName = allAccounts.find(a => a.value === filters.accountId)?.label || "Account";
    XLSX.writeFile(wb, `Statement-${accountName.replace(/[:\\/\\s]+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "تم التصدير بنجاح" });
  };

  const handlePrint = () => window.print();

  const handleCopyIndexUrl = () => {
    if (firestoreIndexUrl) {
      navigator.clipboard.writeText(firestoreIndexUrl);
      toast({
        title: "تم نسخ الرابط بنجاح!",
        description: "الرجاء فتح الرابط في متصفح جديد لإنشاء الفهرس.",
      });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-160px)] gap-4">
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4 lg:sticky top-20 self-start">
          <Card>
            <CardHeader>
              <CardTitle>خيارات العرض</CardTitle>
              <CardDescription>
                اختر الحساب والفترة الزمنية لتجميع جميع الحركات المالية المرتبطة به.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ReportFilters
                accounts={allAccounts}
                vouchers={allFilters}
                officers={officerOptions}
                currencies={currencyOptions}
              />
              <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full h-11 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Filter className="h-4 w-4" />
                <span>عرض الكشف</span>
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 flex flex-col bg-card rounded-lg shadow-sm overflow-hidden h-full lg:min-h-[calc(100vh-120px)]">
          <header className="flex flex-col gap-3 p-3 border-b bg-muted/20 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في النتائج..."
                value={filters.searchTerm}
                onChange={e => formMethods.setValue('searchTerm', e.target.value)}
                className="ps-10 h-10"
              />
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {/* This div will handle the horizontal scrolling on small screens */}
            </div>

            <div className="flex items-center gap-2 lg:ml-auto">
               {lastRefreshedAt && <span className="text-xs text-muted-foreground">آخر تحديث: {format(new Date(lastRefreshedAt), "HH:mm:ss")}</span>}
              <Button onClick={handleGenerateReport} variant="ghost" size="icon" disabled={isLoading || !filters.accountId} title="تحديث البيانات">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button onClick={handleExport} variant="ghost" size="icon" disabled={finalTransactions.length === 0} title="تصدير إلى Excel">
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={handlePrint} variant="ghost" size="icon" disabled={finalTransactions.length === 0} title="طباعة">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : error ? (
              <div className="p-8">
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>حدث خطأ في قاعدة البيانات!</AlertTitle>
                  <AlertDescription>
                    <p>يتطلب هذا الاستعلام إنشاء فهرس مركب في Firestore. بدون هذا الفهرس، لا يمكن جلب البيانات.</p>
                    {firestoreIndexUrl && (
                      <div className="mt-4">
                        <Button onClick={handleCopyIndexUrl}>
                          <Copy className="me-2 h-4 w-4" />نسخ رابط إنشاء الفهرس
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-4">
                <Tabs defaultValue="table" className="flex-1 flex flex-col">
                  <TabsList className="w-full max-w-md overflow-x-auto">
                    <TabsTrigger value="table">جدول الحركات</TabsTrigger>
                    <TabsTrigger value="insights">التحليلات</TabsTrigger>
                    <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
                  </TabsList>
                  <Separator className="mt-3" />
                  <TabsContent value="table" className="flex-1 mt-4">
                    <div className="h-full overflow-auto rounded-lg border bg-background">
                      <ReportTable
                        transactions={finalTransactions}
                        showOpeningBalance={filters.showOpeningBalance}
                        openingBalances={report?.currencyBreakdown.reduce((acc, curr) => ({ ...acc, [curr.currency]: curr.openingBalance }), {}) || {}}
                        onRefresh={handleGenerateReport}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="insights" className="mt-4"><ReportInsights transactions={finalTransactions} currencyFilter={filters.currency} currencyMetadata={currencyDisplayMetadata} /></TabsContent>
                  <TabsContent value="timeline" className="mt-4"><ReportTimeline transactions={finalTransactions} /></TabsContent>
                </Tabs>
              </div>
            )}
          </div>
          {report && <footer className="p-3 border-t bg-card"><ReportSummary report={report} /></footer>}
        </main>
      </div>
    </FormProvider>
  );
}
