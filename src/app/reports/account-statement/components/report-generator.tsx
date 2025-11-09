
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
import { Loader2, Search, Filter, FileText, Download, Printer, Plane, CreditCard, Repeat, Layers3, Share2, Wand2, AreaChart, Wallet, Boxes, FileUp, FileDown, BookUser, XCircle, RefreshCw, Banknote, GitBranch, ArrowRightLeft, ChevronsRightLeft, Building, Users, Terminal, Copy } from "lucide-react";
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

interface ReportGeneratorProps {
  boxes?: Box[];
  clients?: Client[];
  suppliers?: Supplier[];
  exchanges?: Exchange[];
  defaultAccountId?: string;
}

type ReportFiltersState = {
  accountId: string;
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
  const formMethods = useForm<ReportFiltersState>({
    defaultValues: {
      accountId: defaultAccountId || "",
      dateRange: createDefaultDateRange(),
      searchTerm: "",
      currency: "both",
      typeFilter: new Set<string>(),
      direction: "all",
      officer: "all",
      minAmount: "",
      maxAmount: "",
      showOpeningBalance: true,
    }
  });
  const { watch, reset } = formMethods;
  const filters = watch();

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
          { value: "expense_tickets", label: "تكلفة التذاكر" },
          { value: "expense_visa", label: "تكلفة الفيزا" },
        ];
        return [...clientOptions, ...supplierOptions, ...boxOptions, ...exchangeOptions, ...staticAccounts];
  }, [clients, suppliers, boxes, exchanges]);

  const allFilters = useMemo(
    () => [
        { id: "booking", label: mapVoucherLabel("booking"), icon: Plane, group: "basic" as const },
        { id: "visa", label: mapVoucherLabel("visa"), icon: CreditCard, group: "basic" as const },
        { id: "subscription", label: mapVoucherLabel("subscription"), icon: Repeat, group: "basic" as const },
        { id: "payment", label: mapVoucherLabel("payment"), icon: FileUp, group: "basic" as const },
        { id: "standard_receipt", label: mapVoucherLabel("standard_receipt"), icon: FileDown, group: "basic" as const },
        { id: "manualExpense", label: mapVoucherLabel("manualExpense"), icon: Banknote, group: "basic" as const },
        { id: "distributed_receipt", label: mapVoucherLabel("distributed_receipt"), icon: GitBranch, group: "other" as const },
        { id: "remittance", label: mapVoucherLabel("remittance"), icon: ArrowRightLeft, group: "other" as const },
        { id: "transfer", label: mapVoucherLabel("transfer"), icon: Repeat, group: "other" as const },
        { id: "exchange_transaction", label: mapVoucherLabel("exchange_transaction"), icon: ChevronsRightLeft, group: "other" as const },
        { id: "exchange_payment", label: mapVoucherLabel("exchange_payment"), icon: ChevronsRightLeft, group: "other" as const },
        { id: "segment", label: mapVoucherLabel("segment"), icon: Layers3, group: "other" as const },
        { id: "profit-sharing", label: mapVoucherLabel("profit-sharing"), icon: Share2, group: "other" as const },
        { id: "journal_voucher", label: mapVoucherLabel("journal_voucher"), icon: BookUser, group: "other" as const },
        { id: "refund", label: mapVoucherLabel("refund"), icon: RefreshCw, group: "other" as const },
        { id: "exchange", label: mapVoucherLabel("exchange"), icon: RefreshCw, group: "other" as const },
        { id: "void", label: mapVoucherLabel("void"), icon: XCircle, group: "other" as const },
    ],
    []
  );
  
  useEffect(() => {
    formMethods.setValue('typeFilter', new Set(allFilters.map((filter) => filter.id)));
  }, [allFilters, formMethods]);

  const officerOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.officer) {
        set.add(tx.officer);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const handleGenerateReport = useCallback(async () => {
    const formFilters = formMethods.getValues();
    if (!formFilters.accountId) {
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

    const accountType = formFilters.accountId.startsWith('expense_') ? 'expense'
      : formFilters.accountId.startsWith('revenue_') ? 'revenue'
      : clients.some(c => c.id === formFilters.accountId) ? 'relation'
      : suppliers.some(s => s.id === formFilters.accountId) ? 'relation'
      : boxes.some(b => b.id === formFilters.accountId) ? 'box'
      : exchanges.some(ex => ex.id === formFilters.accountId) ? 'exchange'
      : 'static';
    
    const relationKind = clients.some(c => c.id === formFilters.accountId) ? 'client' :
                         suppliers.some(s => s.id === formFilters.accountId) ? 'supplier' : undefined;

    try {
      const { transactions: data, openingBalances: ob } = await getAccountStatement({
        accountId: formFilters.accountId,
        dateFrom: formFilters.dateRange?.from,
        dateTo: formFilters.dateRange?.to,
        voucherType: Array.from(formFilters.typeFilter),
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
        currency: formFilters.currency,
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
  }, [formMethods, toast, clients, suppliers, boxes, exchanges, navData]);


  useEffect(() => {
    if (defaultAccountId) {
      formMethods.setValue('accountId', defaultAccountId);
      handleGenerateReport();
    }
  }, [defaultAccountId, handleGenerateReport, formMethods]);

  const resetFilters = useCallback(() => {
    reset({
      accountId: filters.accountId,
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
  }, [allFilters, reset, filters.accountId]);

  const filteredTransactions = useMemo(() => {
    const rawMin = filters.minAmount !== "" ? Number(filters.minAmount) : null;
    const rawMax = filters.maxAmount !== "" ? Number(filters.maxAmount) : null;
    const minAmount = rawMin !== null && Number.isFinite(rawMin) ? rawMin : null;
    const maxAmount = rawMax !== null && Number.isFinite(rawMax) ? maxAmount : null;

    return transactions.filter((tx) => {
      if (filters.typeFilter.size > 0 && !filters.typeFilter.has(tx.type)) {
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
  }, [transactions, filters]);

  const finalTransactions = useMemo(() => {
    return filteredTransactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

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

  useEffect(() => {
    if (
      filters.currency !== "both" &&
      !currencyOptions.some((option) => option.code === filters.currency)
    ) {
      formMethods.setValue('currency', "both");
    }
  }, [currencyOptions, filters.currency, formMethods]);
  
  const selectedAccountLabel = useMemo(() => {
    return allAccounts.find((account) => account.value === filters.accountId)?.label;
  }, [allAccounts, filters.accountId]);

  const appliedFilterBadges = useMemo(() => {
    const badges: { id: string; label: string }[] = [];

    if (filters.currency !== "both") {
      const currencyLabel =
        currencyDisplayMetadata[filters.currency]?.name || filters.currency;
      badges.push({
        id: "currency",
        label: `العملة: ${currencyLabel}`,
      });
    }

    if (filters.direction !== "all") {
      badges.push({
        id: "direction",
        label: filters.direction === "debit" ? "حركات مدينة" : "حركات دائنة",
      });
    }

    if (filters.officer !== "all") {
      badges.push({ id: "officer", label: `الموظف: ${filters.officer}` });
    }

    if (filters.minAmount !== "") {
      badges.push({ id: "min", label: `حد أدنى: ${filters.minAmount}` });
    }

    if (filters.maxAmount !== "") {
      badges.push({ id: "max", label: `حد أقصى: ${filters.maxAmount}` });
    }

    if (filters.typeFilter.size > 0 && filters.typeFilter.size !== allFilters.length) {
      const labels = Array.from(filters.typeFilter).map((typeId) => mapVoucherLabel(typeId));
      labels.slice(0, 4).forEach((label, index) => {
        badges.push({ id: `type-${index}`, label });
      });
      if (labels.length > 4) {
        badges.push({ id: "type-more", label: `+${labels.length - 4} عمليات` });
      }
    }

    if (filters.dateRange?.from || filters.dateRange?.to) {
      const fromLabel = filters.dateRange?.from
        ? format(filters.dateRange.from, "yyyy-MM-dd")
        : "";
      const toLabel = filters.dateRange?.to
        ? format(filters.dateRange.to, "yyyy-MM-dd")
        : "";
      badges.push({ id: "range", label: `الفترة: ${fromLabel} → ${toLabel}` });
    }

    if (filters.searchTerm) {
      badges.push({ id: "search", label: `بحث: ${filters.searchTerm}` });
    }

    return badges;
  }, [filters, allFilters, currencyDisplayMetadata]);

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
    const accountName = selectedAccountLabel || "Account";
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
                filters={filters}
                onFiltersChange={(newFilters) => reset(newFilters)}
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
            <div className="flex flex-wrap items-center gap-1">
              {appliedFilterBadges.map((badge) => (
                <Badge key={badge.id} variant="outline" className="text-xs">
                  {badge.label}
                </Badge>
              ))}
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
            ) : finalTransactions.length === 0 && !report ? (
              <Card className="border-dashed h-full flex flex-col items-center justify-center text-center">
                <CardHeader>
                  <CardTitle className="text-lg">لا توجد حركات خلال الفترة المختارة</CardTitle>
                  <CardDescription>قم بتعديل الفلاتر أو تغيير الفترة الزمنية لعرض نتائج أخرى.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" onClick={resetFilters}>إعادة تعيين الفلاتر</Button>
                </CardFooter>
              </Card>
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

    