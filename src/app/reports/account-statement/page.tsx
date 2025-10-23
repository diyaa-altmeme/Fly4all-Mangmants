
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Scale, BarChart, CalendarDays } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, Bar, ComposedChart } from 'recharts';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountStatementDashboard() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId');
  const accountType = searchParams.get('accountType');
  const accountName = searchParams.get('accountName');

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    startDate: '',
    endDate: '',
    trend: 'stable'
  });

  useEffect(() => {
    async function loadData() {
      if (!accountId || !accountType) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const vouchersRef = collection(db, "journal-vouchers");
      const q = query(vouchersRef, orderBy("date", "asc"));
      const snapshot = await getDocs(q);

      const results: any[] = [];
      let runningBalance = 0;

      snapshot.forEach(doc => {
        const v = doc.data();
        v.entries?.forEach((e: any) => {
          if (e.accountId === accountId && e.accountType === accountType) {
            const debit = e.debit || 0;
            const credit = e.credit || 0;
            runningBalance += debit - credit;
            results.push({
              date: v.date.seconds * 1000,
              debit,
              credit,
              balance: runningBalance
            });
          }
        });
      });
      
      setData(results);
      setIsLoading(false);
    }
    loadData();
  }, [accountId, accountType]);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Group by month
    const monthlyData: Record<string, {debit: number, credit: number, balance: number}> = {};
    let runningBalance = 0;

    data.forEach(item => {
      const month = format(new Date(item.date), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { debit: 0, credit: 0, balance: 0 };
      }
      monthlyData[month].debit += item.debit;
      monthlyData[month].credit += item.credit;
      runningBalance += item.debit - item.credit;
      monthlyData[month].balance = runningBalance;
    });

    return Object.entries(monthlyData).map(([month, values]) => ({
      name: month,
      ...values
    }));

  }, [data]);
  
  useEffect(() => {
    if (data.length > 0) {
      const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
      const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);
      const balance = totalDebit - totalCredit;

      let trend = 'stable';
      if (data.length > 1) {
        const startBalance = data[0].balance;
        const endBalance = data[data.length - 1].balance;
        if (endBalance > startBalance) trend = 'upward';
        if (endBalance < startBalance) trend = 'downward';
      }

      setSummary({
        totalDebit,
        totalCredit,
        balance,
        startDate: format(new Date(data[0].date), 'dd MMM yyyy'),
        endDate: format(new Date(data[data.length - 1].date), 'dd MMM yyyy'),
        trend
      });
    }
  }, [data]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin mr-2 h-8 w-8" /> جاري تحميل لوحة المعلومات...</div>;
  }
  
  if (!accountId || !accountType) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl">الرجاء تحديد حساب لعرض لوحة المعلومات</h1>
        <Button asChild className="mt-4">
          <Link href="/reports/account-statement">
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة إلى كشف الحساب
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart className="text-primary" />
          لوحة معلومات: {accountName || accountId}
        </h1>
        <Button asChild variant="outline">
          <Link href="/reports/account-statement">
            <ArrowLeft className="mr-2 h-4 w-4" />
            العودة إلى كشف الحساب
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="إجمالي المدين" value={summary.totalDebit} icon={TrendingUp} color="text-green-600" />
        <StatCard title="إجمالي الدائن" value={summary.totalCredit} icon={TrendingDown} color="text-red-600" />
        <StatCard title="الرصيد النهائي" value={summary.balance} icon={Scale} color={summary.balance >= 0 ? "text-blue-600" : "text-orange-600"} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1"><CardHeader><CardTitle className="text-sm">الفترة</CardTitle></CardHeader><CardContent className="text-lg font-bold">{summary.startDate} - {summary.endDate}</CardContent></Card>
        <Card className="col-span-1"><CardHeader><CardTitle className="text-sm">الاتجاه العام</CardTitle></CardHeader><CardContent className="text-lg font-bold">{summary.trend === 'upward' ? 'تصاعدي' : (summary.trend === 'downward' ? 'تنازلي' : 'مستقر')}</CardContent></Card>
        <Card className="col-span-1"><CardHeader><CardTitle className="text-sm">عدد الحركات</CardTitle></CardHeader><CardContent className="text-lg font-bold">{data.length}</CardContent></Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>التدفق المالي الشهري</CardTitle>
          <CardDescription>مقارنة بين إجمالي الحركات المدينة والدائنة شهريًا</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="debit" name="مدين" fill="#16a34a" />
              <Bar dataKey="credit" name="دائن" fill="#dc2626" />
              <Line type="monotone" dataKey="balance" name="الرصيد" stroke="#2563eb" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-right">{formattedValue}</div>
      </CardContent>
    </Card>
  );
}

    