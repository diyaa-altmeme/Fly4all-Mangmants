
"use client";

import React, { useTransition, useMemo, useState } from 'react';
import { updateSettings } from "@/app/settings/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import type { FinanceAccountsMap, TreeNode, AppSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
    receivableAccountId: z.string().optional(),
    payableAccountId: z.string().optional(),
    defaultCashId: z.string().optional(),
    defaultBankId: z.string().optional(),
    preventDirectCashRevenue: z.boolean().default(false),
    rev_tickets: z.string().optional(),
    rev_visas: z.string().optional(),
    rev_subscriptions: z.string().optional(),
    rev_segments: z.string().optional(),
    rev_profit_dist: z.string().optional(),
    exp_cost_tickets: z.string().optional(),
    exp_cost_visas: z.string().optional(),
    exp_oper_salaries: z.string().optional(),
    exp_oper_rent: z.string().optional(),
    exp_oper_util: z.string().optional(),
    exp_marketing: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface FinanceAccountSettingsProps {
    initialFinanceMap: FinanceAccountsMap;
    chartOfAccounts: TreeNode[];
    initialSettings: AppSettings;
    onSaveSuccess: () => void;
}

const flattenNodes = (nodes: TreeNode[], prefix = ""): { id: string; label: string }[] => {
    let flatList: { id: string; label: string }[] = [];
    for (const node of nodes) {
        const nodeLabel = `${prefix}${node.code} — ${node.name}`;
        // A leaf node is one that does not have children.
        if (!node.children || node.children.length === 0) {
            flatList.push({ id: node.id, label: nodeLabel });
        }
        if (node.children && node.children.length > 0) {
            flatList = flatList.concat(flattenNodes(node.children, prefix + "  "));
        }
    }
    return flatList;
};


export default function FinanceAccountSettings({ initialFinanceMap, chartOfAccounts, onSaveSuccess }: FinanceAccountSettingsProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
          receivableAccountId: initialFinanceMap?.receivableAccountId || '',
          payableAccountId: initialFinanceMap?.payableAccountId || '',
          defaultCashId: initialFinanceMap?.defaultCashId || '',
          defaultBankId: initialFinanceMap?.defaultBankId || '',
          preventDirectCashRevenue: initialFinanceMap?.preventDirectCashRevenue || false,
          rev_tickets: initialFinanceMap?.revenueMap?.tickets || '',
          rev_visas: initialFinanceMap?.revenueMap?.visas || '',
          rev_subscriptions: initialFinanceMap?.revenueMap?.subscriptions || '',
          rev_segments: initialFinanceMap?.revenueMap?.segments || '',
          rev_profit_dist: initialFinanceMap?.revenueMap?.profit_distribution || '',
          exp_cost_tickets: initialFinanceMap?.expenseMap?.cost_tickets || '',
          exp_cost_visas: initialFinanceMap?.expenseMap?.cost_visas || '',
          exp_oper_salaries: initialFinanceMap?.expenseMap?.operating_salaries || '',
          exp_oper_rent: initialFinanceMap?.expenseMap?.operating_rent || '',
          exp_oper_util: initialFinanceMap?.expenseMap?.operating_utilities || '',
          exp_marketing: initialFinanceMap?.expenseMap?.marketing || '',
      }
  });

  const accountOptions = useMemo(() => flattenNodes(chartOfAccounts), [chartOfAccounts]);

  const handleFormSubmit = async (data: FormValues) => {
    const financePayload: FinanceAccountsMap = {
        receivableAccountId: data.receivableAccountId,
        payableAccountId: data.payableAccountId,
        defaultCashId: data.defaultCashId,
        defaultBankId: data.defaultBankId,
        preventDirectCashRevenue: data.preventDirectCashRevenue,
        revenueMap: {
            tickets: data.rev_tickets,
            visas: data.rev_visas,
            subscriptions: data.rev_subscriptions,
            segments: data.rev_segments,
            profit_distribution: data.rev_profit_dist,
        },
        expenseMap: {
            cost_tickets: data.exp_cost_tickets,
            cost_visas: data.exp_cost_visas,
            operating_salaries: data.exp_oper_salaries,
            operating_rent: data.exp_oper_rent,
            operating_utilities: data.exp_oper_util,
            marketing: data.exp_marketing,
        }
    };
    
    const result = await updateSettings({ financeAccounts: financePayload });
    if (result.success) {
        toast({ title: "تم الحفظ بنجاح" });
        onSaveSuccess();
    } else {
        toast({ title: "خطأ", description: "فشل حفظ البيانات.", variant: "destructive" });
    }
  }
  
  const SelectRow = ({ name, label }: { name: keyof FormValues; label: string; }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="font-semibold">{label}</div>
      <div className="col-span-2">
         <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر حسابًا..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent side="top" align="end">
                            {accountOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </FormItem>
            )}
        />
      </div>
    </div>
  );

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">الذمم</div>
        <SelectRow name="receivableAccountId" label="الذمم المدينة (العملاء)" />
        <SelectRow name="payableAccountId" label="الذم الدائنة (الموردين)" />
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">النقدية</div>
        <SelectRow name="defaultCashId" label="الصندوق الافتراضي" />
        <SelectRow name="defaultBankId" label="الحساب البنكي الافتراضي" />
        <FormField
            control={form.control}
            name="preventDirectCashRevenue"
            render={({ field }) => (
                <FormItem className="flex items-center gap-2 text-sm">
                    <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormLabel>منع تسجيل الإيراد مباشرة في الصندوق</FormLabel>
                </FormItem>
            )}
        />
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">إيرادات حسب الوحدة</div>
        <SelectRow name="rev_tickets" label="إيرادات التذاكر" />
        <SelectRow name="rev_visas" label="إيرادات الفيزا" />
        <SelectRow name="rev_subscriptions" label="إيرادات الاشتراكات" />
        <SelectRow name="rev_segments" label="إيرادات السكمنت" />
        <SelectRow name="rev_profit_dist" label="إيرادات توزيع الأرباح" />
        </div>

        <Separator />

        <div className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground">مصاريف</div>
        <SelectRow name="exp_cost_tickets" label="تكلفة التذاكر" />
        <SelectRow name="exp_cost_visas" label="تكلفة الفيزا" />
        <SelectRow name="exp_oper_salaries" label="رواتب" />
        <SelectRow name="exp_oper_rent" label="إيجار" />
        <SelectRow name="exp_oper_util" label="فواتير وخدمات" />
        <SelectRow name="exp_marketing" label="تسويق" />
        </div>

        <div className="pt-4 flex items-center gap-2">
        <Button type="submit" className="font-bold" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin me-2" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ الربط
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            سيؤثر هذا الربط على القيود الجديدة فورًا.
        </div>
        </div>
    </form>
    </Form>
  );
}
