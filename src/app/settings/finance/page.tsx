
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFinanceSettings } from '../advanced-accounts-setup/actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import type { NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';

const InfoRow = ({ label, value }: { label: string, value?: string }) => (
    <div className="flex justify-between items-center p-3 border-b">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{value || 'غير محدد'}</span>
    </div>
);

export default function FinanceControlCenterReadOnly() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NormalizedFinanceAccounts | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const fetchedSettings = await getFinanceSettings();
        setSettings(fetchedSettings);
      } catch (e: any) {
        toast({ title: 'فشل التحميل', description: e?.message || 'خطأ غير معروف', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);
  
   if (loading) {
    return (
      <div dir="rtl" className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">مركز التحكم المالي</h1>
          <p className="text-sm text-muted-foreground">عرض الحسابات الرئيسية المرتبطة بالنظام.</p>
        </div>
        <Button asChild>
            <Link href="/settings/advanced-accounts-setup">
                <ArrowLeft className="ms-2 h-4 w-4"/>
                إدارة وربط الحسابات
            </Link>
        </Button>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>الحسابات المرتبطة</CardTitle>
          <CardDescription>هذه هي الحسابات المستخدمة حاليًا في العمليات التلقائية.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <InfoRow label="حساب الإيرادات العامة" value={settings?.generalRevenueId} />
                <InfoRow label="حساب المصروفات العامة" value={settings?.generalExpenseId} />
                <InfoRow label="حساب الذمم المدينة (AR)" value={settings?.receivableAccountId} />
                <InfoRow label="حساب الذمم الدائنة (AP)" value={settings?.payableAccountId} />
                <InfoRow label="الصندوق الافتراضي" value={settings?.defaultCashId} />
                <InfoRow label="البنك الافتراضي" value={settings?.defaultBankId} />
                <InfoRow label="إيرادات التذاكر" value={settings?.revenueMap?.tickets} />
                <InfoRow label="إيرادات الفيزا" value={settings?.revenueMap?.visas} />
                <InfoRow label="إيرادات الاشتراكات" value={settings?.revenueMap?.subscriptions} />
                <InfoRow label="إيرادات السكمنت" value={settings?.revenueMap?.segments} />
                <InfoRow label="منع ترحيل الإيراد للصندوق" value={settings?.preventDirectCashRevenue ? 'مفعل' : 'غير مفعل'} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
