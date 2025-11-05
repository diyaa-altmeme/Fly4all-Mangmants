"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useDebounce } from "@/hooks/use-debounce";
import { getAllVouchers, type Voucher } from "../list/actions";
import {
  DEFAULT_VOUCHER_TABS_ORDER,
  getVoucherTypeLabel,
  type NormalizedVoucherType,
} from "@/lib/accounting/voucher-types";
import {
  Loader2,
  RefreshCw,
  Search,
  ArrowUpRight,
  FileText,
} from "lucide-react";

const formatCurrency = (value: number | undefined, currency: string) => {
  const amount = Number(value) || 0;
  const options = currency === "IQD"
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `${new Intl.NumberFormat("en-US", options).format(amount)} ${currency}`;
};

const VoucherLogPage = () => {
  const { toast } = useToast();
  const { data: navData, loaded: isNavLoaded } = useVoucherNav();
  const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"all" | NormalizedVoucherType>("all");
  const debouncedSearch = useDebounce(searchTerm, 250);

  const fetchLog = React.useCallback(async () => {
    if (!navData || !isNavLoaded) return;
    setIsLoading(true);
    try {
      const data = await getAllVouchers(
        navData.clients,
        navData.suppliers,
        navData.boxes,
        navData.users,
        navData.settings
      );
      setVouchers(data || []);
    } catch (error: any) {
      console.error("Failed to load voucher log", error);
      toast({
        title: "خطأ في تحميل السجل",
        description: error?.message || "تعذر تحميل سجل السندات.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isNavLoaded, navData, toast]);

  React.useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const searchedVouchers = React.useMemo(() => {
    if (!debouncedSearch) return vouchers;
    const term = debouncedSearch.toLowerCase();
    return vouchers.filter((voucher) => {
      return (
        voucher.invoiceNumber?.toLowerCase().includes(term) ||
        voucher.companyName?.toLowerCase().includes(term) ||
        voucher.officer?.toLowerCase().includes(term) ||
        voucher.notes?.toLowerCase().includes(term) ||
        voucher.id?.toLowerCase().includes(term)
      );
    });
  }, [vouchers, debouncedSearch]);

  const tabDefinitions = React.useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", searchedVouchers.length);
    searchedVouchers.forEach((voucher) => {
      const key = voucher.normalizedType || "other";
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const presentTypes = Array.from(counts.keys()).filter((key) => key !== "all") as NormalizedVoucherType[];
    const ordered = [
      ...DEFAULT_VOUCHER_TABS_ORDER.filter((type) => presentTypes.includes(type) && counts.has(type)),
      ...presentTypes.filter((type) => !DEFAULT_VOUCHER_TABS_ORDER.includes(type)),
    ];

    return [
      { id: "all" as const, label: "جميع السندات", count: counts.get("all") || 0 },
      ...ordered.map((type) => ({ id: type, label: getVoucherTypeLabel(type), count: counts.get(type) || 0 })),
    ];
  }, [searchedVouchers]);

  const filteredByTab = React.useMemo(() => {
    if (activeTab === "all") return searchedVouchers;
    return searchedVouchers.filter((voucher) => (voucher.normalizedType || "other") === activeTab);
  }, [searchedVouchers, activeTab]);

  const groupedByDate = React.useMemo(() => {
    const groups = new Map<string, Voucher[]>();
    filteredByTab.forEach((voucher) => {
      const rawDate = voucher.createdAt || voucher.date;
      const safeDate = rawDate ? parseISO(rawDate) : new Date();
      const dateKey = format(safeDate, "yyyy-MM-dd");
      const list = groups.get(dateKey) || [];
      list.push(voucher);
      groups.set(dateKey, list);
    });

    return Array.from(groups.entries())
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => {
          const dateA = a.createdAt || a.date;
          const dateB = b.createdAt || b.date;
          const timeA = dateA ? parseISO(dateA).getTime() : 0;
          const timeB = dateB ? parseISO(dateB).getTime() : 0;
          return timeB - timeA;
        }),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredByTab]);

  if (isLoading || !isNavLoaded) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 self-end" />
          <Skeleton className="h-4 w-72 self-end" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[420px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-right">
          <CardTitle className="flex items-center justify-end gap-2">
            <span>سجل السندات</span>
            <FileText className="h-5 w-5" />
          </CardTitle>
          <CardDescription>
            تتبع كل السندات المالية والزمن الذي أُنشئت به مع عرض سريع للتفاصيل الرئيسية.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث برقم السند أو الجهة أو الموظف..."
              className="ps-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLog}
            className="h-10 w-10"
            title="تحديث السجل"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="flex w-full flex-wrap justify-end gap-2">
            {tabDefinitions.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <span>{tab.label}</span>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeTab} className="mt-4">
            {groupedByDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p>لا توجد سندات مطابقة للبحث الحالي.</p>
              </div>
            ) : (
              <ScrollArea className="h-[520px]">
                <div className="space-y-6 pe-4">
                  {groupedByDate.map((group) => (
                    <section key={group.date} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(group.date), "EEEE, dd MMM yyyy")}
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {group.entries.length} سند
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {group.entries.map((voucher) => {
                          const rawDate = voucher.createdAt || voucher.date;
                          const timestamp = rawDate ? parseISO(rawDate) : new Date();
                          const voucherRoute = `/accounts/vouchers/${voucher.id}/edit`;
                          return (
                            <div
                              key={`${voucher.id}_${rawDate}`}
                              className="rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getVoucherTypeLabel(voucher.normalizedType || "other")}
                                  </Badge>
                                  <span className="font-mono text-xs text-muted-foreground">#{voucher.invoiceNumber || voucher.id}</span>
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                  {formatCurrency((voucher as any).totalAmount || voucher.debitEntries?.[0]?.amount, voucher.currency || "USD")}
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">الجهة</p>
                                  <p className="font-medium text-foreground">
                                    {voucher.companyName || voucher.originalData?.meta?.clientName || voucher.originalData?.meta?.supplierName || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">المستخدم</p>
                                  <p className="font-medium text-foreground">{voucher.officer || "غير معروف"}</p>
                                </div>
                              </div>
                              {voucher.notes && (
                                <p className="mt-3 text-sm text-muted-foreground">
                                  {voucher.notes}
                                </p>
                              )}
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{format(timestamp, "HH:mm:ss")}</span>
                                <Link
                                  href={voucherRoute}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  عرض السند
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VoucherLogPage;

