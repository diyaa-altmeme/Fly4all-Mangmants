

"use client";

import React, { Suspense } from 'react';
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useDebounce } from "@/hooks/use-debounce";
import { getAllVouchers, type Voucher } from "./actions";
import {
  DEFAULT_VOUCHER_TABS_ORDER,
  getVoucherTypeLabel,
  type NormalizedVoucherType,
  normalizeVoucherType,
} from "@/lib/accounting/voucher-types";
import {
  Loader2,
  RefreshCw,
  Search,
  ArrowUpRight,
  FileText,
  Trash2,
  Plane,
  CreditCard,
  Repeat,
  Layers3,
  Share2,
  GitBranch,
  ArrowRightLeft,
  ChevronsRightLeft,
  Banknote,
  BookUser,
  FileDown,
  FileUp,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { permanentDeleteVoucher } from "@/app/system/deleted-log/actions";


const formatCurrency = (value: number | undefined, currency: string) => {
  const amount = Number(value) || 0;
  const options = currency === "IQD"
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `${new Intl.NumberFormat("en-US", options).format(amount)} ${currency}`;
};

const VoucherTypeIcon = ({ type }: { type?: string }) => {
  const normalized = normalizeVoucherType(type) as NormalizedVoucherType;
  const typeMap: Record<NormalizedVoucherType | 'other', React.ElementType> = {
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
    exchange: RefreshCw,
    void: FileText,
    exchange_transaction: ChevronsRightLeft,
    exchange_payment: ChevronsRightLeft,
    exchange_adjustment: ChevronsRightLeft,
    exchange_revenue: ChevronsRightLeft,
    exchange_expense: ChevronsRightLeft,
    other: FileText,
  };
  const Icon = typeMap[normalized] || FileText;
  return <Icon className="h-4 w-4" />;
};

function VoucherLogContent() {
  const { toast } = useToast();
  const { data: navData, loaded: isNavLoaded, fetchData: fetchNavData } = useVoucherNav();
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
  
  const handleDeleteVoucher = async (voucherId: string) => {
    const result = await permanentDeleteVoucher(voucherId);
    if(result.success) {
      toast({ title: 'تم الحذف النهائي للسند بنجاح' });
      fetchLog(); // Refresh data
    } else {
      toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
    }
  }

  const filteredBySearch = React.useMemo(() => {
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

  const filteredVouchers = React.useMemo(() => {
    if (activeTab === "all") return filteredBySearch;
    return filteredBySearch.filter((voucher) => (voucher.normalizedType || "other") === activeTab);
  }, [filteredBySearch, activeTab]);
  

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
                <div className="border rounded-lg overflow-x-auto">
                    <Table dir="rtl">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">النوع</TableHead>
                                <TableHead className="font-bold">رقم الفاتورة</TableHead>
                                <TableHead className="font-bold">الحالة</TableHead>
                                <TableHead className="font-bold">المبلغ</TableHead>
                                <TableHead className="font-bold">الجهة</TableHead>
                                <TableHead className="font-bold">المستخدم</TableHead>
                                <TableHead className="font-bold">الوصف</TableHead>
                                <TableHead className="font-bold">التاريخ</TableHead>
                                <TableHead className="text-center font-bold">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredVouchers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">لا توجد سجلات مطابقة.</TableCell>
                            </TableRow>
                        ) : filteredVouchers.map(voucher => {
                            const rawDate = voucher.createdAt || voucher.date;
                            const timestamp = rawDate ? parseISO(rawDate as string) : new Date();
                            const voucherRoute = `/accounts/vouchers/${voucher.id}/edit`;
                            const amount = (voucher as any).totalAmount || (voucher.debitEntries?.[0]?.amount);
                            const currency = voucher.currency || "USD";
                            const isCredit = (voucher as any).creditEntries?.length > 0;
                            return (
                                <TableRow key={`${voucher.id}_${rawDate}`}>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            <VoucherTypeIcon type={voucher.normalizedType || 'other'} />
                                            <span className="ms-1.5">{getVoucherTypeLabel(voucher.normalizedType || "other")}</span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">#{voucher.invoiceNumber || voucher.id}</TableCell>
                                    <TableCell>
                                        <Badge variant={voucher.isDeleted ? "destructive" : "default"} className={cn(voucher.isDeleted ? "" : "bg-green-500")}>
                                            {voucher.isDeleted ? 'محذوف' : 'فعال'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn("font-bold font-mono", isCredit ? "text-green-600" : "text-red-600")}>
                                        {formatCurrency(amount, currency)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {voucher.companyName || voucher.originalData?.meta?.clientName || voucher.originalData?.meta?.supplierName || "-"}
                                    </TableCell>
                                    <TableCell>{voucher.officer || "غير معروف"}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{voucher.notes}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {format(timestamp, "yyyy-MM-dd HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <div className="flex items-center justify-center gap-1">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="px-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-3.5 w-3.5 me-1" />
                                                        حذف نهائي
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>هل أنت متأكد من الحذف النهائي؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            سيؤدي هذا الإجراء إلى حذف السند وكل السجلات الأصلية المرتبطة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteVoucher(voucher.id!)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، قم بالحذف النهائي</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <Button asChild variant="secondary" size="sm" className="px-2 h-7 text-xs">
                                                <Link href={voucherRoute} className="inline-flex items-center gap-1">
                                                عرض السند
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
  );
};

const VoucherLogPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VoucherLogContent />
        </Suspense>
    )
}

export default VoucherLogPage;
