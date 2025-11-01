"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ChartAccount, FinanceAccountsMap } from "@/lib/types";
import { getChartOfAccounts, getFinanceAccounts, saveFinanceAccounts } from "./actions";

export default function AdvancedAccountsSetupPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [model, setModel] = useState<FinanceAccountsMap | null>(null);

  // جلب البيانات بعد التحميل
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [coa, fa] = await Promise.all([
          getChartOfAccounts(),
          getFinanceAccounts()
        ]);
        if (!mounted) return;
        setAccounts(coa);
        setModel(fa || {
          receivableAccountId: "",
          payableAccountId: "",
          hybridRelationAccountId: "",
          clearingAccountId: "",
          defaultCashId: "",
          defaultBankId: "",
          preventDirectCashRevenue: true,
          revenueMap: { tickets: "", visas: "", subscriptions: "", segments: "", other: "" },
          expenseMap: { tickets: "", visas: "", subscriptions: "", partners: "", operating: "" }
        });
      } catch (e: any) {
        toast({ title: "فشل جلب البيانات", description: e?.message, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  const byType = useMemo(() => ({
    asset: accounts.filter(a => a.type === "asset"),
    liability: accounts.filter(a => a.type === "liability"),
    revenue: accounts.filter(a => a.type === "revenue"),
    expense: accounts.filter(a => a.type === "expense"),
    clearing: accounts.filter(a => a.type === "clearing"),
  }), [accounts]);

  const onSave = async () => {
    if (!model) return;
    try {
      await saveFinanceAccounts(model);
      toast({ title: "تم الحفظ بنجاح" });
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e?.message, variant: "destructive" });
    }
  };

  if (loading || !model) return <div className="p-6">جارِ التحميل…</div>;

  const Sel = (value: string, onChange: (v: string)=>void, options: ChartAccount[]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="اختر حسابًا" /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.id} value={o.id}>{o.code} — {o.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>ربط الحسابات الرئيسية بالنظام</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2 font-semibold">الذمم المدينة (العملاء)</div>
            {Sel(model.receivableAccountId, v => setModel({ ...model, receivableAccountId: v }), byType.asset)}
          </div>

          <div>
            <div className="mb-2 font-semibold">الذمم الدائنة (الموردون)</div>
            {Sel(model.payableAccountId, v => setModel({ ...model, payableAccountId: v }), byType.liability)}
          </div>

          <div>
            <div className="mb-2 font-semibold">العلاقات المزدوجة (AR/AP هجينة)</div>
            {Sel(model.hybridRelationAccountId ?? "", v => setModel({ ...model, hybridRelationAccountId: v }), byType.asset)}
          </div>

          <div>
            <div className="mb-2 font-semibold">حساب التسوية (Clearing)</div>
            {Sel(model.clearingAccountId ?? "", v => setModel({ ...model, clearingAccountId: v }), byType.clearing)}
          </div>

          <div>
            <div className="mb-2 font-semibold">الصندوق الافتراضي</div>
            {Sel(model.defaultCashId ?? "", v => setModel({ ...model, defaultCashId: v }), byType.asset)}
          </div>

          <div>
            <div className="mb-2 font-semibold">الحساب البنكي الافتراضي</div>
            {Sel(model.defaultBankId ?? "", v => setModel({ ...model, defaultBankId: v }), byType.asset)}
          </div>

          <div className="md:col-span-2 pt-2 border-t">
            <div className="mb-2 font-semibold">خريطة الإيرادات</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>{Sel(model.revenueMap.tickets, v => setModel({ ...model, revenueMap: { ...model.revenueMap, tickets: v }}), byType.revenue)}</div>
              <div>{Sel(model.revenueMap.visas, v => setModel({ ...model, revenueMap: { ...model.revenueMap, visas: v }}), byType.revenue)}</div>
              <div>{Sel(model.revenueMap.subscriptions, v => setModel({ ...model, revenueMap: { ...model.revenueMap, subscriptions: v }}), byType.revenue)}</div>
              <div>{Sel(model.revenueMap.segments, v => setModel({ ...model, revenueMap: { ...model.revenueMap, segments: v }}), byType.revenue)}</div>
              <div>{Sel(model.revenueMap.other ?? "", v => setModel({ ...model, revenueMap: { ...model.revenueMap, other: v }}), byType.revenue)}</div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 font-semibold">خريطة المصروفات</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>{Sel(model.expenseMap.tickets, v => setModel({ ...model, expenseMap: { ...model.expenseMap, tickets: v }}), byType.expense)}</div>
              <div>{Sel(model.expenseMap.visas, v => setModel({ ...model, expenseMap: { ...model.expenseMap, visas: v }}), byType.expense)}</div>
              <div>{Sel(model.expenseMap.subscriptions, v => setModel({ ...model, expenseMap: { ...model.expenseMap, subscriptions: v }}), byType.expense)}</div>
              <div>{Sel(model.expenseMap.partners ?? "", v => setModel({ ...model, expenseMap: { ...model.expenseMap, partners: v }}), byType.expense)}</div>
              <div>{Sel(model.expenseMap.operating ?? "", v => setModel({ ...model, expenseMap: { ...model.expenseMap, operating: v }}), byType.expense)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave}>حفظ الإعدادات</Button>
      </div>
    </div>
  );
}
