"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { addTransaction, watchTransactions, type Transaction, type TxCategory, type TxKind } from "@/lib/transactions";
import UnifiedReportTable from "@/components/finance/UnifiedReportTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, RefreshCw } from "lucide-react";

// استورد أدواتك الأصلية هنا:
/// import SegmentTool from "@/components/segment/segment-tool";
/// import SubscriptionTool from "@/components/subscriptions/subscription-tool";
/// import ProfitShareTool from "@/components/profits/profit-share-tool";

export default function FinanceOverviewPage() {
  const [shareR, setShareR] = useState(50);
  const [shareM, setShareM] = useState(50);
  const [alertMonthlyCap, setAlertMonthlyCap] = useState(15000);
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterCompany, setFilterCompany] = useState("");
  const [filterCategory, setFilterCategory] = useState<TxCategory | "all">("all");
  const [rows, setRows] = useState<Transaction[]>([]);

  useEffect(() => {
    const unsub = watchTransactions(new Date(fromDate + "T00:00:00"), new Date(toDate + "T23:59:59"), (data) => {
      let list = data;
      if (filterCompany) list = list.filter(r => r.company?.includes(filterCompany));
      if (filterCategory !== "all") list = list.filter(r => r.category === filterCategory);
      setRows(list);
    });
    return () => unsub();
  }, [fromDate, toDate, filterCompany, filterCategory]);

  const handleSave = async (tx: Omit<Transaction, "id" | "createdAt">) => await addTransaction(tx);

  const exportCSV = () => {
    const header = ["التاريخ","الشركة","التصنيف","النوع","المبلغ","الرصيد","ملاحظات"];
    let running = 0;
    const lines = rows.map(r => {
      running += r.kind === "credit" ? r.amount : -r.amount;
      return [
        format(r.date, "yyyy-MM-dd"),
        r.company,
        r.category,
        r.kind === "credit" ? "دائن" : "مدين",
        r.amount,
        running,
        r.notes || ""
      ];
    });
    const csv = [header, ...lines].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report_${fromDate}_${toDate}.csv`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>العمليات المالية الشاملة</CardTitle>
          <CardDescription>إدارة كل العمليات المالية والتقرير بنفس الصفحة</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="segment">
            <TabsList>
              <TabsTrigger value="segment">سكمنت</TabsTrigger>
              <TabsTrigger value="subscription">اشتراكات</TabsTrigger>
              <TabsTrigger value="profit">توزيع الحصص</TabsTrigger>
            </TabsList>
            <TabsContent value="segment">
              {/* <SegmentTool onSave={handleSave} /> */}
            </TabsContent>
            <TabsContent value="subscription">
              {/* <SubscriptionTool onSave={handleSave} /> */}
            </TabsContent>
            <TabsContent value="profit">
              {/* <ProfitShareTool onSave={handleSave} /> */}
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <div className="grid grid-cols-6 gap-2">
            <div>
              <Label>نسبة الروضتين %</Label>
              <Input value={shareR} onChange={(e)=>setShareR(Number(e.target.value))} />
            </div>
            <div>
              <Label>نسبة متين %</Label>
              <Input value={shareM} onChange={(e)=>setShareM(Number(e.target.value))} />
            </div>
            <div>
              <Label>من</Label>
              <Input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>إلى</Label>
              <Input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            </div>
            <div>
              <Label>فلتر الشركة</Label>
              <Input value={filterCompany} onChange={(e)=>setFilterCompany(e.target.value)} />
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> تصدير CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كشف الحساب الموحد</CardTitle>
          <CardDescription>عرض مباشر وتحليل مالي شامل</CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedReportTable rows={rows} shareR={shareR} shareM={shareM} />
        </CardContent>
      </Card>
    </div>
  );
}
