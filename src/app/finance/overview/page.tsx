
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import type { Transaction, TxCategory, TxKind } from "@/lib/transactions";
import UnifiedReportTable from "@/components/finance/UnifiedReportTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Layers3, Repeat, Share2, Search, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import AddSegmentPeriodDialog from "@/app/segments/add-segment-period-dialog";
import AddSubscriptionDialog from "@/app/subscriptions/components/add-subscription-dialog";
import AddManualProfitDialog from "@/app/profit-sharing/components/add-manual-profit-dialog";
import { useVoucherNav } from "@/context/voucher-nav-context";
import { useRouter } from "next/navigation";
import { Autocomplete } from "@/components/ui/autocomplete";
import { getAccountStatement } from "@/app/reports/actions";
import type { ReportInfo } from "@/lib/types";


export default function FinanceOverviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [shareR, setShareR] = useState(50);
  const [shareM, setShareM] = useState(50);
  const [alertMonthlyCap, setAlertMonthlyCap] = useState(15000);
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<TxCategory | "all">("all");
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: navData, loaded: isDataLoaded, fetchData } = useVoucherNav();
  
  useEffect(() => {
    if (!isDataLoaded) {
      fetchData();
    }
  }, [isDataLoaded, fetchData]);

  const handleGenerateReport = async () => {
    if (!accountId) {
      toast({ title: "الرجاء اختيار حساب", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReport(null);
    try {
      const reportData = await getAccountStatement({
        accountId: accountId,
        currency: "both",
        dateRange: { from: new Date(fromDate), to: new Date(toDate) },
        typeFilter: filterCategory === "all" ? [] : [filterCategory],
      });
      setReport(reportData);
    } catch (e: any) {
      toast({ title: "خطأ في جلب التقرير", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const allAccounts = useMemo(() => {
    if (!navData) return [];
    return [
      ...(navData.clients || []).map(c => ({ value: c.id, label: `عميل: ${c.name}` })),
      ...(navData.suppliers || []).map(s => ({ value: s.id, label: `مورد: ${s.name}` })),
      ...(navData.boxes || []).map(b => ({ value: b.id, label: `صندوق: ${b.name}` })),
      ...(navData.exchanges || []).map(ex => ({ value: ex.id, label: `بورصة: ${ex.name}` })),
    ];
  }, [navData]);

  const handleSuccess = async () => {
    router.refresh();
    await fetchData(true); // Force refetch
  }

  const exportCSV = () => {
    if (!report?.transactions || report.transactions.length === 0) {
        toast({ title: "لا توجد بيانات للتصدير", variant: "destructive"});
        return;
    }
    const header = ["التاريخ", "النوع", "البيان", "مدين", "دائن", "الرصيد", "العملة", "الموظف"];
    const lines = report.transactions.map(r => [
      format(new Date(r.date), "yyyy-MM-dd"),
      r.type,
      typeof r.description === 'string' ? r.description : r.description.title,
      r.debit,
      r.credit,
      r.balance,
      r.currency,
      r.officer || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`));
    const csv = [header.join(","), ...lines.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report_${accountId}_${fromDate}_${toDate}.csv`;
    a.click();
  };
  
  const allPartners = useMemo(() => {
      if(!navData) return [];
      return [...(navData.clients || []), ...(navData.suppliers || [])];
  }, [navData]);


  if (!isDataLoaded) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
                        clients={navData?.clients || []} 
                        suppliers={navData?.suppliers || []} 
                        onSuccess={handleSuccess} 
                    />
                    <AddSubscriptionDialog onSubscriptionAdded={handleSuccess} />
                    <AddManualProfitDialog partners={allPartners} onSuccess={handleSuccess} />
                </div>

                <div className="flex gap-2 items-center">
                    <Autocomplete
                      options={allAccounts}
                      value={accountId}
                      onValueChange={setAccountId}
                      placeholder="🔍 ابحث عن شركة أو علاقة..."
                      className="min-w-[220px]"
                    />
                    <Button onClick={handleGenerateReport} disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin me-2" /> : null}
                      عرض كشف الحساب
                    </Button>
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
          {report && <CardDescription>عرض مباشر وتحليل مالي شامل لـ: <b>{allAccounts.find(a => a.value === accountId)?.label}</b></CardDescription>}
        </CardHeader>
        <CardContent>
           {isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div> :
           <UnifiedReportTable report={report} shareR={shareR} shareM={shareM} />}
        </CardContent>
      </Card>
    </div>
  );
}
