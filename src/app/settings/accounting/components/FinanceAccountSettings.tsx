
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { updateSettings } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import type { TreeNode } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Switch } from '@/components/ui/switch';
import { buildTree } from '../chart-of-accounts/utils';
import {
    normalizeFinanceAccounts,
    serializeFinanceAccounts,
    type NormalizedFinanceAccounts,
} from '@/lib/finance/finance-accounts';

const formSchema = z.object({
    receivableAccountId: z.string().optional(),
    payableAccountId: z.string().optional(),
    hybridRelationAccountId: z.string().optional(),
    clearingAccountId: z.string().optional(),
    defaultCashId: z.string().optional(),
    defaultBankId: z.string().optional(),
    preventDirectCashRevenue: z.boolean().default(false),
    generalRevenueId: z.string().optional(),
    generalExpenseId: z.string().optional(),
    rev_tickets: z.string().optional(),
    rev_visas: z.string().optional(),
    rev_subscriptions: z.string().optional(),
    rev_segments: z.string().optional(),
    rev_other: z.string().optional(),
    exp_tickets: z.string().optional(),
    exp_visas: z.string().optional(),
    exp_subscriptions: z.string().optional(),
    exp_partners: z.string().optional(),
    exp_operating: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FinanceAccountSettingsProps {
    initialFinanceMap: NormalizedFinanceAccounts;
    chartOfAccounts: TreeNode[];
    onSaveSuccess: () => void;
}

type AccountOption = { value: string; label: string; type?: string };

const flattenNodes = (nodes: TreeNode[], level = 0): AccountOption[] => {
    const prefix = level > 0 ? `${'—'.repeat(level)} ` : '';
    return nodes.flatMap(node => {
        const current: AccountOption = {
            value: node.id,
            label: `${prefix}${node.code} — ${node.name}`,
            type: node.type,
        };
        const children = node.children && node.children.length > 0
            ? flattenNodes(node.children, level + 1)
            : [];
        return [current, ...children];
    });
};


export default function FinanceAccountSettings({ initialFinanceMap, chartOfAccounts, onSaveSuccess }: FinanceAccountSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
          preventDirectCashRevenue: initialFinanceMap?.preventDirectCashRevenue ?? false,
      },
  });

  const accountOptions = useMemo(() => {
    const tree = buildTree(chartOfAccounts);
    return flattenNodes(tree);
  }, [chartOfAccounts]);

  const accountsByCode = useMemo(() => {
      const map = new Map<string, string>();
      chartOfAccounts.forEach(acc => map.set(acc.code, acc.id));
      return map;
  }, [chartOfAccounts]);

  useEffect(() => {
    setLoading(true);
    const normalized = normalizeFinanceAccounts(initialFinanceMap);
    
    // Auto-linking logic
    const getAccountIdByCode = (code: string) => accountsByCode.get(code) || '';

    const defaultValues: Partial<FormValues> = {
        receivableAccountId: normalized.receivableAccountId || getAccountIdByCode('1-1-2-1'),
        payableAccountId: normalized.payableAccountId || getAccountIdByCode('2-1-1-1'),
        hybridRelationAccountId: normalized.hybridRelationAccountId || getAccountIdByCode('1-1-2-2'),
        clearingAccountId: normalized.clearingAccountId || getAccountIdByCode('1-1-3'),
        defaultCashId: normalized.defaultCashId || getAccountIdByCode('1-1-1'), // Default Cash Box
        defaultBankId: normalized.defaultBankId, // No default code for bank
        generalRevenueId: normalized.generalRevenueId || getAccountIdByCode('4'),
        generalExpenseId: normalized.generalExpenseId || getAccountIdByCode('5'),
        preventDirectCashRevenue: normalized.preventDirectCashRevenue || false,
        rev_tickets: normalized.revenueMap?.tickets || getAccountIdByCode('4-1-1'),
        rev_visas: normalized.revenueMap?.visas || getAccountIdByCode('4-1-2'),
        rev_subscriptions: normalized.revenueMap?.subscriptions || getAccountIdByCode('4-1-3'),
        rev_segments: normalized.revenueMap?.segments || getAccountIdByCode('4-1-4'),
        rev_other: normalized.revenueMap?.other || getAccountIdByCode('4-2'),
        exp_tickets: normalized.expenseMap?.tickets || getAccountIdByCode('5-1-1'),
        exp_visas: normalized.expenseMap?.visas || getAccountIdByCode('5-1-2'),
        exp_subscriptions: normalized.expenseMap?.subscriptions || getAccountIdByCode('5-1-3'),
        exp_partners: normalized.expenseMap?.partners || getAccountIdByCode('5-1-4'),
        exp_operating: normalized.expenseMap?.operating || getAccountIdByCode('5-2'),
    };
    
    form.reset(defaultValues);
    setLoading(false);
  }, [initialFinanceMap, accountsByCode, form]);

  const handleFormSubmit = async (data: FormValues) => {
    try {
        const financePayload = serializeFinanceAccounts({
            receivableAccountId: data.receivableAccountId,
            payableAccountId: data.payableAccountId,
            hybridRelationAccountId: data.hybridRelationAccountId,
            clearingAccountId: data.clearingAccountId,
            defaultCashId: data.defaultCashId,
            defaultBankId: data.defaultBankId,
            generalRevenueId: data.generalRevenueId,
            generalExpenseId: data.generalExpenseId,
            preventDirectCashRevenue: data.preventDirectCashRevenue,
            revenueMap: {
                tickets: data.rev_tickets,
                visas: data.rev_visas,
                subscriptions: data.rev_subscriptions,
                segments: data.rev_segments,
                other: data.rev_other,
            },
            expenseMap: {
                tickets: data.exp_tickets,
                visas: data.exp_visas,
                subscriptions: data.exp_subscriptions,
                partners: data.exp_partners,
                operating: data.exp_operating,
            },
        });

        const result = await updateSettings({ financeAccounts: financePayload as any });
        if (result.success) {
            toast({ title: "تم الحفظ بنجاح" });
            onSaveSuccess();
        } else {
            toast({ title: "خطأ", description: result.error || "فشل حفظ البيانات.", variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "خطأ", description: error.message || 'تعذر حفظ البيانات.', variant: 'destructive' });
    }
  }

  const SelectRow = ({ name, label, options }: { name: keyof FormValues; label: string; options: AccountOption[] }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="font-semibold">{label}</div>
      <div className="col-span-2">
         <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <Autocomplete options={options} value={field.value || ''} onValueChange={field.onChange} placeholder="اختر حسابًا..." />
                </FormItem>
            )}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
        <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="h-6 w-1/4 mb-4" />
                    <div className="space-y-3">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            ))}
        </div>
    )
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">الذمم</div>
            <SelectRow name="receivableAccountId" label="الذمم المدينة (العملاء)" options={accountOptions} />
            <SelectRow name="payableAccountId" label="الذمم الدائنة (الموردين)" options={accountOptions} />
            <SelectRow name="hybridRelationAccountId" label="العلاقات المزدوجة (هجينة)" options={accountOptions} />
        </div>
        <Separator />
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">النقدية والتسوية</div>
            <SelectRow name="defaultCashId" label="الصندوق الافتراضي" options={accountOptions} />
            <SelectRow name="defaultBankId" label="الحساب البنكي الافتراضي" options={accountOptions} />
            <SelectRow name="clearingAccountId" label="حساب التسوية (Clearing)" options={accountOptions} />
        </div>
        <Separator />
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">حسابات رئيسية</div>
            <SelectRow name="generalRevenueId" label="الإيرادات العامة" options={accountOptions} />
            <SelectRow name="generalExpenseId" label="المصروفات العامة" options={accountOptions} />
        </div>
        <Separator />
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">السياسات</div>
            <FormField
                control={form.control}
                name="preventDirectCashRevenue"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div className="space-y-1">
                            <FormLabel className="text-base">منع ترحيل الإيرادات مباشرة للصندوق</FormLabel>
                            <FormDescription>
                                عند التفعيل سيتم إجبار النظام على استخدام حسابات الإيراد المحددة بدلاً من الصندوق النقدي في قيود الإيراد.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                )}
            />
        </div>
        <Separator />
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">خريطة الإيرادات</div>
            <div className="grid md:grid-cols-2 gap-4">
                <SelectRow name="rev_tickets" label="إيرادات التذاكر" options={accountOptions} />
                <SelectRow name="rev_visas" label="إيرادات الفيزا" options={accountOptions} />
                <SelectRow name="rev_subscriptions" label="إيرادات الاشتراكات" options={accountOptions} />
                <SelectRow name="rev_segments" label="إيرادات السكمنت" options={accountOptions} />
                <SelectRow name="rev_other" label="إيرادات أخرى" options={accountOptions} />
            </div>
        </div>
        <Separator />
        <div className="space-y-3">
            <div className="text-sm font-bold text-muted-foreground">خريطة المصروفات</div>
             <div className="grid md:grid-cols-2 gap-4">
                <SelectRow name="exp_tickets" label="تكلفة التذاكر" options={accountOptions} />
                <SelectRow name="exp_visas" label="تكلفة الفيزا" options={accountOptions} />
                <SelectRow name="exp_subscriptions" label="تكلفة الاشتراكات" options={accountOptions} />
                <SelectRow name="exp_partners" label="مصروفات الشركاء" options={accountOptions} />
                <SelectRow name="exp_operating" label="مصروفات تشغيلية" options={accountOptions} />
            </div>
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
