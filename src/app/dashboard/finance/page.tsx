
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { format } from "date-fns";
import { normalizeFinanceAccounts } from "@/lib/finance/finance-accounts";
import { enrichVoucherEntries } from "@/lib/finance/account-categories";

const parseVoucherDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date : new Date();
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return new Date();
};

export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState({
    revenue: 0,
    expense: 0,
    profit: 0,
    cash: 0,
    vouchers: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function loadFinanceData() {
      const [settingsSnap, vouchersSnap] = await Promise.all([
        getDoc(doc(db, "settings", "app_settings")),
        getDocs(collection(db, "journal-vouchers")),
      ]);

      const finance = normalizeFinanceAccounts(settingsSnap.data()?.financeAccounts);

      let totalRevenue = 0;
      let totalExpense = 0;
      let totalCash = 0;
      const chartMap: Record<string, number> = {};

      vouchersSnap.forEach((doc) => {
        const data = doc.data();
        const entries = enrichVoucherEntries(data, finance);
        const monthKey = format(parseVoucherDate(data.date || data.createdAt), "MMM");

        entries.forEach((entry) => {
          if (entry.accountType === "revenue") totalRevenue += entry.credit || 0;
          if (entry.accountType === "expense") totalExpense += entry.debit || 0;
          if (entry.accountType === "cash" || entry.accountType === "bank") {
            totalCash += (entry.debit || 0) - (entry.credit || 0);
          }
        });

        const voucherTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
        chartMap[monthKey] = (chartMap[monthKey] || 0) + voucherTotal;
      });

      const chartArray = Object.entries(chartMap).map(([month, value]) => ({
        month,
        value,
      }));

      const profit = totalRevenue - totalExpense;

      setSummary({
        revenue: totalRevenue,
        expense: totalExpense,
        profit,
        cash: totalCash,
        vouchers: vouchersSnap.size,
      });

      setChartData(chartArray);
    }

    loadFinanceData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Wallet className="h-6 w-6 text-primary" />
        لوحة القيادة المالية
      </h1>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="الإيرادات الكلية" value={summary.revenue} icon={TrendingUp} color="text-green-600" />
        <StatCard title="المصروفات الكلية" value={summary.expense} icon={TrendingDown} color="text-red-600" />
        <StatCard title="صافي الربح" value={summary.profit} icon={DollarSign} color="text-blue-600" />
        <StatCard title="إجمالي النقد" value={summary.cash} icon={Wallet} color="text-teal-600" />
        <StatCard title="عدد القيود" value={summary.vouchers} icon={BarChart3} color="text-yellow-600" />
      </div>

      {/* المخطط البياني */}
      <Card>
        <CardHeader>
          <CardTitle>الأداء الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-md border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-right">{value.toLocaleString()} $</div>
      </CardContent>
    </Card>
  );
}
