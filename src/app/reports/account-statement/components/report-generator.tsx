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
import {
  Loader2,
  Search,
  Filter,
  FileText,
  Download,
  Printer,
  Plane,
  CreditCard,
  Repeat,
  Layers3,
  Share2,
  Wallet,
  FileUp,
  FileDown,
  BookUser,
  XCircle,
  RefreshCw,
  Banknote,
  GitBranch,
  ArrowRightLeft,
  ChevronsRightLeft,
  Building,
  Users,
  Terminal,
  Copy,
} from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useToast } from "@/hooks/use-toast";
import { getAccountStatement } from "@/app/reports/actions";
import { DateRange } from "react-day-picker";
import { format, subDays, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import ReportTable from "@/app/reports/account-statement/components/report-table";
import ReportFilters from "@/app/reports/account-statement/components/report-filters";
import ReportSummary from "@/app/reports/account-statement/components/report-summary";
import ReportInsights from "@/app/reports/account-statement/components/report-insights";
import ReportTimeline from "@/app/reports/account-statement/components/report-timeline";
import type {
  Box,
  Client,
  Supplier,
  Currency,
  Exchange,
  ReportTransaction,
  ReportInfo,
} from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
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

interface ReportGeneratorProps {
  boxes: Box[];
  clients: Client[];
  suppliers: Supplier[];
  exchanges: Exchange[];
  defaultAccountId?: string;
}

const createDefaultDateRange = (): DateRange => ({
  from: subDays(new Date(), 30),
  to: new Date(),
});

const amountForTransaction = (tx: ReportTransaction): number => {
  if (typeof tx.amount === "number") return Math.abs(tx.amount);
  if (tx.debit && tx.debit > 0) return tx.debit;
  if (tx.credit && tx.credit > 0) return tx.credit;
  return Math.abs(tx.balance || 0);
};

const buildReportSummary = (
  transactions: ReportTransaction[],
  currency: Currency | "both"
): ReportInfo => {
  let totalDebitUSD = 0;
  let totalCreditUSD = 0;
  let totalDebitIQD = 0;
  let totalCreditIQD = 0;

  transactions.forEach((tx) => {
    if (tx.currency === "USD") {
      totalDebitUSD += tx.debit || 0;
      totalCreditUSD += tx.credit || 0;
    }
    if (tx.currency === "IQD") {
      totalDebitIQD += tx.debit || 0;
      totalCreditIQD += tx.credit || 0;
    }
  });

  const firstTransaction = transactions[0];
  const lastTransaction = transactions[transactions.length - 1];

  const openingBalanceUSD = firstTransaction
    ? firstTransaction.balanceUSD -
      (firstTransaction.currency === "USD"
        ? (firstTransaction.debit || 0) - (firstTransaction.credit || 0)
        : 0)
    : 0;
  const openingBalanceIQD = firstTransaction
    ? firstTransaction.balanceIQD -
      (firstTransaction.currency === "IQD"
        ? (firstTransaction.debit || 0) - (firstTransaction.credit || 0)
        : 0)
    : 0;

  const finalBalanceUSD = lastTransaction?.balanceUSD ?? 0;
  const finalBalanceIQD = lastTransaction?.balanceIQD ?? 0;

  return {
    title: "كشف الحساب",
    transactions,
    openingBalanceUSD,
    openingBalanceIQD,
    totalDebitUSD,
    totalCreditUSD,
    finalBalanceUSD,
    totalDebitIQD,
    totalCreditIQD,
    finalBalanceIQD,
    currency,
    accountType: "asset",
    balanceMode: "asset",
  };
};

export default function ReportGenerator({
  boxes = [],
  clients = [],
  suppliers = [],
  exchanges = [],
  defaultAccountId,
}: ReportGeneratorProps) {
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const { data: navData } = useVoucherNav();

  const [accountType, setAccountType] = useState<
    "relation" | "box" | "exchange" | "static" | "expense"
  >("relation");

  const [filters, setFilters] = useState(() => ({
    accountId: defaultAccountId || "",
    dateRange: createDefaultDateRange() as DateRange | undefined,
    searchTerm: "",
    currency: "both" as Currency | "both",
    typeFilter: new Set<string>(),
    direction: "all" as "all" | "debit" | "credit",
    officer: "all",
    minAmount: "",
    maxAmount: "",
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const { toast } = useToast();

  const firestoreIndexUrl =
    error && error.startsWith("FIRESTORE_INDEX_URL::")
      ? error.split("::")[1]
      : null;

  const allAccounts = useMemo(() => {
    switch (accountType) {
      case "box":
        return boxes.map((b) => ({ value: b.id, label: b.name }));
      case "exchange":
        return exchanges.map((ex) => ({ value: ex.id, label: ex.name }));
      case "expense":
        return (
          navData?.settings.voucherSettings?.expenseAccounts?.map((e) => ({
            value: `expense_${e.id}`,
            label: e.name,
          })) || []
        );
      case "static":
        return [
          { value: "revenue_segments", label: "إيراد: السكمنت" },
          { value: "revenue_profit_distribution", label: "إيراد: توزيع الأرباح" },
          { value: "revenue_tickets", label: "إيرادات التذاكر" },
          { value: "revenue_visa", label: "إيرادات الفيزا" },
          { value: "expense_tickets", label: "تكلفة التذاكر" },
          { value: "expense_visa", label: "تكلفة الفيزا" },
        ];
      case "relation":
      default:
        const clientOptions = clients.map((c) => ({
          value: c.id,
          label: `عميل: ${c.name}`,
        }));
        const supplierOptions = suppliers.map((s) => ({
          value: s.id,
          label: `مورد: ${s.name}`,
        }));
        return [...clientOptions, ...supplierOptions];
    }
  }, [accountType, clients, suppliers, boxes, exchanges, navData]);

  const allFilters = useMemo(
    () => [
      { id: "booking", label: "حجز طيران", icon: Plane, group: "basic" },
      { id: "visa", label: "طلب فيزا", icon: CreditCard, group: "basic" },
      { id: "subscription", label: "اشتراك", icon: Repeat, group: "basic" },
      { id: "payment", label: "سند دفع", icon: FileUp, group: "basic" },
      { id: "standard_receipt", label: "سند قبض", icon: FileDown, group: "basic" },
      { id: "manualExpense", label: "سند مصاريف", icon: Banknote, group: "basic" },
      { id: "distributed_receipt", label: "سند قبض مخصص", icon: GitBranch, group: "other" },
      { id: "remittance", label: "حوالة مستلمة", icon: ArrowRightLeft, group: "other" },
      { id: "exchange_transaction", label: "معاملة بورصة", icon: ChevronsRightLeft, group: "other" },
      { id: "exchange_payment", label: "تسديد بورصة", icon: ChevronsRightLeft, group: "other" },
      { id: "segment", label: "سكمنت", icon: Layers3, group: "other" },
      { id: "profit-sharing", label: "توزيع الحصص", icon: Share2, group: "other" },
      { id: "journal_voucher", label: "قيد محاسبي", icon: BookUser, group: "other" },
      { id: "refund", label: "استرجاع تذكرة", icon: RefreshCw, group: "other" },
      { id: "exchange", label: "تغيير تذكرة", icon: RefreshCw, group: "other" },
      { id: "void", label: "إلغاء (فويد)", icon: XCircle, group: "other" },
    ],
    []
  );

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      typeFilter: new Set(allFilters.map((filter) => filter.id)),
    }));
  }, [allFilters]);

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
    if (!filters.accountId) {
      toast({
        title: "خطأ",
        description: "الرجاء اختيار حساب.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setTransactions([]);
    setError(null);

    try {
      const data = await getAccountStatement({
        accountId: filters.accountId,
        dateFrom: filters.dateRange?.from,
        dateTo: filters.dateRange?.to,
        voucherType: Array.from(filters.typeFilter),
      });

      const transactionsData = Array.isArray(data) ? data : [];
      setTransactions(transactionsData);
      setLastRefreshedAt(new Date().toISOString());
    } catch (error: any) {
      setError(error.message);
      setTransactions([]);
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
  }, [filters, toast]);

  useEffect(() => {
    if (defaultAccountId) {
      handleGenerateReport();
    }
  }, [defaultAccountId, handleGenerateReport]);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      dateRange: createDefaultDateRange(),
      searchTerm: "",
      currency: "both",
      typeFilter: new Set(allFilters.map((filter) => filter.id)),
      direction: "all",
      officer: "all",
      minAmount: "",
      maxAmount: "",
    }));
  }, [allFilters]);

  const filteredTransactions = useMemo(() => {
    const rawMin = filters.minAmount !== "" ? Number(filters.minAmount) : null;
    const rawMax = filters.maxAmount !== "" ? Number(filters.maxAmount) : null;
    const minAmount = rawMin !== null && Number.isFinite(rawMin) ? rawMin : null;
    const maxAmount = rawMax !== null && Number.isFinite(rawMax) ? rawMax : null;

    return transactions.filter((tx) => {
      const typeKey = tx.sourceType || tx.voucherType || tx.type;
      if (filters.typeFilter.size > 0 && typeKey && !filters.typeFilter.has(typeKey)) {
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

  const reportSummary = useMemo(() => {
    if (finalTransactions.length === 0) return null;
    return buildReportSummary(finalTransactions, filters.currency);
  }, [finalTransactions, filters.currency]);

  const selectedAccountLabel = useMemo(() => {
    return allAccounts.find((account) => account.value === filters.accountId)?.label;
  }, [allAccounts, filters.accountId]);

  const appliedFilterBadges = useMemo(() => {
    const badges: { id: string; label: string }[] = [];

    if (filters.currency !== "both") {
      badges.push({
        id: "currency",
        label: filters.currency === "USD" ? "العملة: USD" : "العملة: IQD",
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

    const selectedTypes = filters.typeFilter;
    if (selectedTypes.size > 0 && selectedTypes.size !== allFilters.length) {
      const labels = allFilters
        .filter((filter) => selectedTypes.has(filter.id))
        .map((filter) => filter.label);
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
  }, [filters, allFilters]);

  const handleExport = () => {
    if (!finalTransactions || finalTransactions.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const data = finalTransactions.map((tx) => ({
      التاريخ: tx.date ? format(parseISO(tx.date), "yyyy-MM-dd") : "",
      النوع: mapVoucherLabel(tx.sourceType || tx.voucherType || tx.type),
      البيان:
        typeof tx.description === "string"
          ? tx.description
          : tx.description?.title,
      "مدين (USD)": tx.currency === "USD" ? tx.debit : 0,
      "دائن (USD)": tx.currency === "USD" ? tx.credit : 0,
      "الرصيد (USD)": tx.balanceUSD,
      "مدين (IQD)": tx.currency === "IQD" ? tx.debit : 0,
      "دائن (IQD)": tx.currency === "IQD" ? tx.credit : 0,
      "الرصيد (IQD)": tx.balanceIQD,
      الموظف: tx.officer || "",
      الملاحظات: tx.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف الحساب");
    const accountName =
      selectedAccountLabel || allAccounts.find((a) => a.value === filters.accountId)?.label || "Account";
    XLSX.writeFile(
      wb,
      `Statement-${(accountName || "Account").replace(/[:\\/\\s]+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
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
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-160px)] gap-4">
      <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 lg:sticky top-20">
        <Card>
          <CardHeader>
            <CardTitle>خيارات العرض</CardTitle>
            <CardDescription>
              اختر الحساب والفترة الزمنية لتجميع جميع الحركات المالية المرتبطة به.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">نوع الحساب</Label>
              <Select
                value={accountType}
                onValueChange={(v) => {
                  setAccountType(v as any);
                  setFilters((prev) => ({ ...prev, accountId: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relation">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />عميل / مورد
                    </div>
                  </SelectItem>
                  <SelectItem value="box">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />صندوق
                    </div>
                  </SelectItem>
                  <SelectItem value="exchange">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />بورصة
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />مصروف
                    </div>
                  </SelectItem>
                  <SelectItem value="static">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />حساب عام
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">الحساب</Label>
              <Autocomplete
                value={filters.accountId}
                onValueChange={(v) =>
                  setFilters((prev) => ({ ...prev, accountId: v }))
                }
                options={allAccounts}
                placeholder="اختر حسابًا..."
              />
              {selectedAccountLabel && (
                <p className="text-xs text-muted-foreground text-right">
                  سيتم عرض كافة الحركات المتعلقة بالحساب "{selectedAccountLabel}"
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">الفترة الزمنية</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from
                        ? format(filters.dateRange.from, "yyyy-MM-dd")
                        : "من تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.from}
                      onSelect={(d) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, from: d },
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.dateRange?.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.to
                        ? format(filters.dateRange.to, "yyyy-MM-dd")
                        : "إلى تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.to}
                      onSelect={(d) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, to: d },
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              <Filter className="me-2 h-4 w-4" />
              عرض الكشف
            </Button>
            <Separator />
            <ReportFilters
              filters={filters}
              onFiltersChange={setFilters}
              allFilters={allFilters}
              officerOptions={officerOptions}
              onResetFilters={resetFilters}
            />
          </CardContent>
        </Card>
      </aside>

      <div className="flex-1 flex flex-col bg-card rounded-lg shadow-sm overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 justify-between p-3 border-b bg-muted/10">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExport} variant="outline" disabled={finalTransactions.length === 0}>
              <Download className="me-2 h-4 w-4" />Excel
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={finalTransactions.length === 0}>
              <Printer className="me-2 h-4 w-4" />طباعة
            </Button>
            <Button
              onClick={handleGenerateReport}
              variant="ghost"
              disabled={isLoading || !filters.accountId}
              title="تحديث البيانات"
            >
              <RefreshCw className={cn("me-2 h-4 w-4", isLoading && "animate-spin")}
              />
              تحديث
            </Button>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {lastRefreshedAt && (
              <span className="text-xs text-muted-foreground">
                آخر تحديث: {format(new Date(lastRefreshedAt), "yyyy-MM-dd HH:mm")}
              </span>
            )}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في النتائج..."
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
                }
                className="ps-10 h-9"
              />
            </div>
          </div>
        </header>

        <div className="px-4 py-3 border-b bg-muted/20 flex flex-wrap gap-2 items-center">
          <Badge variant="secondary" className="text-xs">
            {finalTransactions.length} حركة مالية
          </Badge>
          {appliedFilterBadges.map((badge) => (
            <Badge key={badge.id} variant="outline" className="text-xs">
              {badge.label}
            </Badge>
          ))}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-8">
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ في قاعدة البيانات!</AlertTitle>
                <AlertDescription>
                  <p>
                    يتطلب هذا الاستعلام إنشاء فهرس مركب في Firestore. بدون هذا الفهرس، لا يمكن جلب البيانات.
                  </p>
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
          ) : finalTransactions.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">لا توجد حركات خلال الفترة المختارة</CardTitle>
                <CardDescription>
                  قم بتعديل الفلاتر أو تغيير الفترة الزمنية لعرض نتائج أخرى.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={resetFilters}>
                  إعادة تعيين الفلاتر
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              {reportSummary && <ReportSummary report={reportSummary} />}
              <ReportInsights
                transactions={finalTransactions}
                currencyFilter={filters.currency}
              />
              <ReportTimeline transactions={finalTransactions} />
              <ReportTable
                transactions={finalTransactions}
                onRefresh={handleGenerateReport}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
