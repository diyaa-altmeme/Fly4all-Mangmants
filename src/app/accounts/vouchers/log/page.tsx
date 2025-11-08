
"use client";

import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
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
import { useAuth } from '@/lib/auth-context';


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
  const { user } = useAuth();

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 250);

  const fetchLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllVouchers();
      setVouchers(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ في تحميل السجل",
        description: error?.message || "تعذر تحميل سجل السندات.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isNavLoaded) {
      fetchLog();
    }
  }, [fetchLog, isNavLoaded]);

  const handleDeleteVoucher = async (voucherId: string) => {
    // Implement permanent delete logic if needed
  };
  
  const allAccountsMap = useMemo(() => {
      if (!navData) return new Map();
      const map = new Map<string, {name: string, type: string}>();
      (navData.clients || []).forEach(c => map.set(c.id, {name: c.name, type: 'client'}));
      (navData.suppliers || []).forEach(s => map.set(s.id, {name: s.name, type: 'supplier'}));
      (navData.boxes || []).forEach(b => map.set(b.id, {name: b.name, type: 'box'}));
      (navData.exchanges || []).forEach(e => map.set(e.id, {name: e.name, type: 'exchange'}));
      // You can add more account types here if needed
      return map;
  }, [navData]);

  const filteredVouchers = useMemo(() => {
    if (!debouncedSearch) return vouchers;
    const term = debouncedSearch.toLowerCase();
    return vouchers.filter((voucher) => {
      const officer = voucher.officer || users.find(u => u.uid === voucher.createdBy)?.name || '';
      const companyName = getAccountNameFromVoucher(voucher, allAccountsMap);
      return (
        voucher.invoiceNumber?.toLowerCase().includes(term) ||
        companyName?.toLowerCase().includes(term) ||
        officer?.toLowerCase().includes(term) ||
        voucher.notes?.toLowerCase().includes(term) ||
        voucher.id?.toLowerCase().includes(term)
      );
    });
  }, [vouchers, debouncedSearch, navData]);

  const getAccountNameFromVoucher = (voucher: Voucher, accountMap: Map<string, {name: string, type: string}>) => {
    const meta = voucher.originalData?.meta || {};
    if (meta.clientId) return accountMap.get(meta.clientId)?.name;
    if (meta.supplierId) return accountMap.get(meta.supplierId)?.name;
    if (meta.companyId) return accountMap.get(meta.companyId)?.name;
    if (voucher.creditEntries?.[0]?.accountId) return accountMap.get(voucher.creditEntries[0].accountId)?.name;
    if (voucher.debitEntries?.[0]?.accountId) return accountMap.get(voucher.debitEntries[0].accountId)?.name;
    return 'حركات متعددة';
  }

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
  
  const { clients, suppliers, users } = navData || {};

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
                        const amount = (voucher.debitEntries?.[0]?.amount || voucher.creditEntries?.[0]?.amount || 0);
                        const currency = voucher.currency || "USD";
                        const isCredit = voucher.creditEntries && voucher.creditEntries.length > 0;
                        const companyName = getAccountNameFromVoucher(voucher, allAccountsMap);
                        const officer = voucher.officer || users?.find(u => u.uid === voucher.createdBy)?.name || '';

                        return (
                            <TableRow key={voucher.id}>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                        <VoucherTypeIcon type={voucher.voucherType || 'other'} />
                                        <span className="ms-1.5">{getVoucherTypeLabel(voucher.voucherType || "other")}</span>
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
                                    {companyName || "-"}
                                </TableCell>
                                <TableCell>{officer || "غير معروف"}</TableCell>
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

export default function VoucherLogPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full"/>}>
            <VoucherLogContent />
        </Suspense>
    )
}
