
"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { addTransaction, watchTransactions, type Transaction, type TxCategory, type TxKind } from "@/lib/transactions";
import UnifiedReportTable from "@/components/finance/UnifiedReportTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Layers3, Repeat, Share2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import AddSegmentPeriodDialog from "@/app/segments/add-segment-period-dialog";
import AddSubscriptionDialog from "@/app/subscriptions/components/add-subscription-dialog";
import AddManualProfitDialog from "@/app/profit-sharing/components/add-manual-profit-dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useRouter } from "next/navigation";


export default function FinanceOverviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [shareR, setShareR] = useState(50);
  const [shareM, setShareM] = useState(50);
  const [alertMonthlyCap, setAlertMonthlyCap] = useState(15000);
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<TxCategory | "all">("all");
  const [rows, setRows] = useState<Transaction[]>([]);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();


  useEffect(() => {
    const unsub = watchTransactions(new Date(fromDate + "T00:00:00"), new Date(toDate + "T23:59:59"), (data) => {
      let list = data;
      if (filterCompany) list = list.filter(r => r.company?.toLowerCase().includes(filterCompany.toLowerCase()));
      if (filterCategory !== "all") list = list.filter(r => r.category === filterCategory);
      setRows(list);
    });
    return () => unsub();
  }, [fromDate, toDate, filterCompany, filterCategory]);

  const handleSave = async (tx: Omit<Transaction, "id" | "createdAt">) => {
    try {
        await addTransaction({
            ...tx,
            date: new Date(tx.date),
            currency: tx.currency || "IQD",
            createdBy: user?.uid || "system"
        });
        toast({ title: "تمت الإضافة بنجاح!" });

        if (tx.amount > 10000) {
            toast({
                title: "تنبيه: عملية بمبلغ كبير",
                description: `تم تسجيل عملية بمبلغ (${tx.amount.toLocaleString()})`,
                variant: 'default' 
            });
        }
    } catch(e: any) {
         toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const searchCompany = () => {
    setFilterCompany(searchTerm);
  };
  
  const exportCSV = () => {
    const header = ["التاريخ", "الشركة", "الحساب", "التصنيف", "النوع", "العملة", "المبلغ", "الرصيد", "الحالة", "ملاحظات"];
    let running = 0;
    const lines = rows.map(r => {
      running += r.kind === "credit" ? r.amount : -r.amount;
      return [
        format(r.date, "yyyy-MM-dd"),
        r.company,
        r.accountName || '-',
        r.category,
        r.kind === "credit" ? "دائن" : "مدين",
        r.currency,
        r.amount,
        running,
        r.status || 'مكتملة',
        r.notes || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`); // Escape quotes and wrap in quotes
    });
    const csv = [header.join(","), ...lines.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report_${fromDate}_${toDate}.csv`;
    a.click();
  };
  
  const handleSuccess = () => {
      router.refresh();
  }

  if (!isDataLoaded || !navData) {
      return <div>جاري تحميل البيانات...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>العمليات المالية الشاملة</CardTitle>
          <CardDescription>إدارة كل العمليات المالية والتقارير من واجهة واحدة متقدمة.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                    <AddSegmentPeriodDialog 
                        clients={navData.clients || []} 
                        suppliers={navData.suppliers || []} 
                        onSuccess={handleSuccess} 
                    />
                    <AddSubscriptionDialog onSubscriptionAdded={handleSuccess} />
                    <AddManualProfitDialog partners={navData.clients || []} onSuccess={handleSuccess} />
                </div>

                <div className="flex gap-2 items-center">
                    <Input
                    placeholder="🔍 ابحث عن شركة أو علاقة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="min-w-[220px]"
                    />
                    <Button onClick={searchCompany}>عرض كشف الشركة</Button>
                </div>
            </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1"><Label>من</Label><Input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>إلى</Label><Input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} /></div>
             <div className="space-y-1"><Label>فلتر التصنيف</Label><Select value={filterCategory} onValueChange={v => setFilterCategory(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="segment">سكمنت</SelectItem><SelectItem value="subscription">اشتراك</SelectItem><SelectItem value="profit">أرباح</SelectItem><SelectItem value="share">توزيع حصص</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>نسبة الروضتين %</Label><Input type="number" value={shareR} onChange={(e)=>setShareR(Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>نسبة متّين %</Label><Input type="number" value={shareM} onChange={(e)=>setShareM(Number(e.target.value))} /></div>
            <div className="flex items-end justify-end">
              <Button onClick={exportCSV} variant="outline" className="gap-2 w-full"><Download className="h-4 w-4" /> تصدير CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كشف الحساب الموحد</CardTitle>
          <CardDescription>عرض مباشر وتحليل مالي شامل. {filterCompany && <span>عرض كشف حساب لـ: <b>{filterCompany}</b></span>}</CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedReportTable rows={rows} shareR={shareR} shareM={shareM} />
        </CardContent>
      </Card>
    </div>
  );
}
