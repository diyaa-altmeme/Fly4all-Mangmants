
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppSettings, TreeNode } from '@/lib/types';
import { getSettings, updateSettings } from '@/app/settings/actions';
import { getChartOfAccounts } from '../accounting/actions';
import { useVoucherNav } from "@/context/voucher-nav-context";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";


interface AccountSelectProps {
  label: string;
  value: string;
  accounts: TreeNode[];
}

function AccountDisplay({ label, value, accounts }: AccountSelectProps) {
    const selectedAccountName = accounts.find(a => a.id === value)?.name || 'غير محدد';
    return (
        <div className="space-y-2">
            <Label className="font-semibold">{label}</Label>
            <div className="p-2 border rounded-md bg-muted h-10 flex items-center">
                <span className="text-sm font-medium">{selectedAccountName}</span>
            </div>
        </div>
    );
}

export default function FinanceControlCenter() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accounts, setAccounts] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [settingsData, chartData] = await Promise.all([
          getSettings(),
          getChartOfAccounts(),
        ]);
        
        const flatten = (nodes: TreeNode[]): TreeNode[] => {
            let flatList: TreeNode[] = [];
            nodes.forEach(node => {
                flatList.push({ ...node, name: `${'--'.repeat(node.code.length - 1)} ${node.name}` });
                if (node.children?.length > 0) {
                    flatList = [...flatList, ...flatten(node.children)];
                }
            });
            return flatList;
        }

        setAccounts(flatten(chartData));
        setSettings(settingsData);
      } catch (err: any) {
        toast({
          title: "فشل التحميل",
          description: "لا يمكن تحميل البيانات المالية من قاعدة البيانات.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [toast]);


  if (loading || !settings) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { accountsMap, customRevenueAccounts } = settings;

  const filteredAccounts = useMemo(() => ({
    assets: accounts.filter((a) => a.type === "asset"),
    liabilities: accounts.filter((a) => a.type === "liability"),
    income: accounts.filter((a) => a.type === "revenue"),
    expense: accounts.filter((a) => a.type === "expense"),
    cash: accounts.filter((a) => a.name.includes("صندوق") || a.name.includes("cash")),
    bank: accounts.filter((a) => a.name.includes("بنك") || a.name.includes("bank")),
  }), [accounts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>⚙️ مركز التحكم المالي (للعرض فقط)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                هذه الواجهة تعرض الحسابات المرتبطة بالعمليات المالية. لتعديلها، الرجاء استخدام صفحة "إعداد الحسابات المتقدمة".
              </p>
            </div>
            <Button asChild>
                <Link href="/settings/advanced-accounts-setup">
                    <ArrowLeft className="me-2 h-4 w-4" />
                    الانتقال إلى الإعدادات المتقدمة
                </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AccountDisplay label="حساب الذمم المدينة (العملاء)" value={accountsMap?.arAccountId || ''} accounts={accounts} />
            <AccountDisplay label="حساب الذمم الدائنة (الموردين)" value={accountsMap?.apAccountId || ''} accounts={accounts} />
            <AccountDisplay label="حساب الإيرادات العامة" value={accountsMap?.generalRevenueId || ''} accounts={accounts} />
            <AccountDisplay label="حساب المصروفات العامة" value={accountsMap?.generalExpenseId || ''} accounts={accounts} />
            <AccountDisplay label="الصندوق الافتراضي" value={accountsMap?.defaultCashId || ''} accounts={accounts} />
            <AccountDisplay label="الحساب البنكي الافتراضي" value={accountsMap?.defaultBankId || ''} accounts={accounts} />
          </div>

          <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold">حسابات الإيرادات المخصصة</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <AccountDisplay label="إيرادات التذاكر" value={accountsMap?.customRevenues?.tickets || ''} accounts={accounts} />
                  <AccountDisplay label="إيرادات الفيزا" value={accountsMap?.customRevenues?.visas || ''} accounts={accounts} />
                  <AccountDisplay label="إيرادات الاشتراكات" value={accountsMap?.customRevenues?.subscriptions || ''} accounts={accounts} />
                  <AccountDisplay label="إيرادات السكمنت" value={accountsMap?.customRevenues?.segments || ''} accounts={accounts} />
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
