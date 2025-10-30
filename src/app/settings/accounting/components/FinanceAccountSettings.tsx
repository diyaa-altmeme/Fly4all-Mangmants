
"use client";

import React, { useTransition, useMemo } from 'react';
import { updateSettings } from "@/app/settings/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import type { FinanceAccountsMap, TreeNode, AppSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface FinanceAccountSettingsProps {
    initialFinanceMap: FinanceAccountsMap;
    chartOfAccounts: TreeNode[];
    initialSettings: AppSettings;
}

// Helper function to flatten the tree structure for the select options
const flattenNodes = (nodes: TreeNode[], prefix = ""): { id: string; label: string }[] => {
    let flatList: { id: string; label: string }[] = [];
    for (const node of nodes) {
        const nodeLabel = `${prefix}${node.code} — ${node.name}`;
        // A leaf node is one that does not have children.
        if (!node.children || node.children.length === 0) {
            flatList.push({ id: node.id, label: nodeLabel });
        }
        if (node.children && node.children.length > 0) {
            // It's a parent, so we can list it, but also recurse.
            // For this specific use case, we only want to select leaf nodes.
            flatList = flatList.concat(flattenNodes(node.children, prefix + "  "));
        }
    }
    return flatList;
};


export default function FinanceAccountSettings({ initialFinanceMap, chartOfAccounts }: FinanceAccountSettingsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const fa = initialFinanceMap || {};

  const accountOptions = useMemo(() => flattenNodes(chartOfAccounts), [chartOfAccounts]);

  const handleFormSubmit = async (formData: FormData) => {
    startTransition(async () => {
        const financePayload: FinanceAccountsMap = {
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

        const result = await updateSettings({ financeAccounts: financePayload });

        if (result.success) {
            toast({ title: "تم الحفظ بنجاح" });
            // No need for onSaveSuccess, revalidatePath in the action handles data refresh
        } else {
            toast({ title: "خطأ", description: "فشل حفظ البيانات.", variant: "destructive" });
        }
    });
  }
  
  const SelectRow = ({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string; }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="font-semibold">{label}</div>
      <div className="col-span-2">
        <Select name={name} defaultValue={defaultValue || ""}>
          <SelectTrigger><SelectValue placeholder="اختر حسابًا..." /></SelectTrigger>
          <SelectContent side="top" align="end">
            {accountOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
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
        <SelectRow name="payableAccountId" label="الذم الدائنة (الموردين)" defaultValue={fa?.payableAccountId} />
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
