
"use client";

import { updateFinanceAccountsMap } from "../actions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import type { FinanceAccountsMap } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import React, { useTransition } from 'react';

interface AdvancedAccountsClientProps {
    accounts: any[];
    financeAccountsMap: FinanceAccountsMap;
    onSaveSuccess: () => void;
}

export default function AdvancedAccountsClient({ accounts, financeAccountsMap: fa, onSaveSuccess }: AdvancedAccountsClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleFormSubmit = async (formData: FormData) => {
    startTransition(async () => {
        const payload = {
          receivableAccountId: formData.get("receivableAccountId") as string,
          payableAccountId: formData.get("payableAccountId") as string,
          defaultCashId: formData.get("defaultCashId") as string,
          defaultBankId: formData.get("defaultBankId") as string,
          preventDirectCashRevenue: (formData.get("preventDirectCashRevenue") as string) === "on",
    
          revenueMap: {
            tickets: formData.get("rev_tickets") as string,
            visas: formData.get("rev_visas") as string,
            subscriptions: formData.get("rev_subscriptions") as string,
            segments: formData.get("rev_segments") as string,
            profit_distribution: formData.get("rev_profit_dist") as string
          },
          expenseMap: {
            cost_tickets: formData.get("exp_cost_tickets") as string,
            cost_visas: formData.get("exp_cost_visas") as string,
            operating_salaries: formData.get("exp_oper_salaries") as string,
            operating_rent: formData.get("exp_oper_rent") as string,
            operating_utilities: formData.get("exp_oper_util") as string,
            marketing: formData.get("exp_marketing") as string
          }
        };

        const result = await updateFinanceAccountsMap(payload);
        if (result.success) {
            toast({ title: "تم الحفظ بنجاح" });
            onSaveSuccess();
        } else {
            toast({ title: "خطأ", description: "فشل حفظ البيانات.", variant: "destructive" });
        }
    });
  }
  
  const opts = accounts.map((a: any) => ({ id: a.id, label: `${a.code} — ${a.name}` }));

  const SelectRow = ({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string; }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="font-semibold">{label}</div>
      <div className="col-span-2">
        <Select name={name} defaultValue={defaultValue || ""}>
          <SelectTrigger><SelectValue placeholder="اختر حسابًا..." /></SelectTrigger>
          <SelectContent side="top" align="end">
            {opts.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <form action={handleFormSubmit} className="space-y-6">
        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">الذمم</div>
        <SelectRow name="receivableAccountId" label="الذمم المدينة (العملاء)" defaultValue={fa?.receivableAccountId} />
        <SelectRow name="payableAccountId" label="الذمم الدائنة (الموردين)" defaultValue={fa?.payableAccountId} />
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">النقدية</div>
        <SelectRow name="defaultCashId" label="الصندوق الافتراضي" defaultValue={fa?.defaultCashId} />
        <SelectRow name="defaultBankId" label="الحساب البنكي الافتراضي" defaultValue={fa?.defaultBankId} />
        <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="preventDirectCashRevenue" defaultChecked={!!fa?.preventDirectCashRevenue} />
            منع تسجيل الإيراد مباشرة في الصندوق
        </label>
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">إيرادات حسب الوحدة</div>
        <SelectRow name="rev_tickets" label="إيرادات التذاكر" defaultValue={fa?.revenueMap?.tickets} />
        <SelectRow name="rev_visas" label="إيرادات الفيزا" defaultValue={fa?.revenueMap?.visas} />
        <SelectRow name="rev_subscriptions" label="إيرادات الاشتراكات" defaultValue={fa?.revenueMap?.subscriptions} />
        <SelectRow name="rev_segments" label="إيرادات السكمنت" defaultValue={fa?.revenueMap?.segments} />
        <SelectRow name="rev_profit_dist" label="إيرادات توزيع الأرباح" defaultValue={fa?.revenueMap?.profit_distribution} />
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">مصاريف</div>
        <SelectRow name="exp_cost_tickets" label="تكلفة التذاكر" defaultValue={fa?.expenseMap?.cost_tickets} />
        <SelectRow name="exp_cost_visas" label="تكلفة الفيزا" defaultValue={fa?.expenseMap?.cost_visas} />
        <SelectRow name="exp_oper_salaries" label="رواتب" defaultValue={fa?.expenseMap?.operating_salaries} />
        <SelectRow name="exp_oper_rent" label="إيجار" defaultValue={fa?.expenseMap?.operating_rent} />
        <SelectRow name="exp_oper_util" label="فواتير وخدمات" defaultValue={fa?.expenseMap?.operating_utilities} />
        <SelectRow name="exp_marketing" label="تسويق" defaultValue={fa?.expenseMap?.marketing} />
        </div>

        <div className="pt-4 flex items-center gap-2">
        <Button type="submit" className="font-bold" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin me-2" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ الربط
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            سيؤثر هذا الربط على القيود الجديدة فورًا.
        </div>
        </div>
    </form>
  );
}
