"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/app/settings/actions";
import type { AppSettings } from "@/lib/types";

export default function FinanceSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      setSettings(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({ financeAccounts: settings.financeAccounts });
      toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات المالية بنجاح." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const finance = settings?.financeAccounts || {
    receivableAccountId: "",
    payableAccountId: "",
    revenueAccountId: "",
    expenseAccountId: "",
    cashAccountId: "",
    bankAccountId: "",
    blockDirectCashRevenue: false,
    revenueMap: {},
  };

  const updateFinance = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev!,
      financeAccounts: { ...finance, [key]: value },
    }));
  };

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> مركز التحكم المالي
          </CardTitle>
           <CardDescription>
            هنا يمكنك تحديد الحسابات المحاسبية الافتراضية والربط بين العمليات وحساباتها المخصصة في شجرة الحسابات.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>حساب الذمم المدينة (العملاء)</Label>
              <Input value={finance.receivableAccountId} onChange={(e) => updateFinance("receivableAccountId", e.target.value)} />
            </div>
            <div>
              <Label>حساب الذمم الدائنة (الموردين)</Label>
              <Input value={finance.payableAccountId} onChange={(e) => updateFinance("payableAccountId", e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>حساب الإيرادات العام</Label>
              <Input value={finance.revenueAccountId} onChange={(e) => updateFinance("revenueAccountId", e.target.value)} />
            </div>
            <div>
              <Label>حساب المصروف العام</Label>
              <Input value={finance.expenseAccountId} onChange={(e) => updateFinance("expenseAccountId", e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>الصندوق الافتراضي</Label>
              <Input value={finance.cashAccountId} onChange={(e) => updateFinance("cashAccountId", e.target.value)} />
            </div>
            <div>
              <Label>البنك الافتراضي</Label>
              <Input value={finance.bankAccountId} onChange={(e) => updateFinance("bankAccountId", e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Switch
              checked={finance.blockDirectCashRevenue}
              onCheckedChange={(v) => updateFinance("blockDirectCashRevenue", v)}
            />
            <Label>منع تسجيل الأرباح مباشرة في الصندوق</Label>
          </div>

          <Separator />

          <div>
            <Label>خريطة الإيرادات حسب نوع العملية</Label>
            <div className="grid md:grid-cols-2 gap-3 mt-2">
              {["tickets", "visa", "hotel", "groups", "subscriptions", "segments"].map((k) => (
                <div key={k}>
                  <Label>{k}</Label>
                  <Input
                    placeholder="Revenue Account ID"
                    value={finance.revenueMap?.[k] || ""}
                    onChange={(e) =>
                      updateFinance("revenueMap", { ...finance.revenueMap, [k]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />} <Save className="me-2 h-4 w-4" /> حفظ
          </Button>
        </CardFooter>
      </Card>
  );
}
