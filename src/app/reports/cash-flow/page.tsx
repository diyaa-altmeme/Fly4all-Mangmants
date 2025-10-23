
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRightLeft, PieChart } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Pie, PieChart as RChart, Cell } from "recharts";

export default function CashFlowReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    inflow: 0,
    outflow: 0,
    net: 0,
  });

  useEffect(() => {
    async function loadCashFlow() {
      const vouchersRef = collection(db, "journal-vouchers");
      const vouchersSnap = await getDocs(vouchersRef);

      const monthly: Record<string, { inflow: number; outflow: number }> = {};
      let inflow = 0;
      let outflow = 0;

      vouchersSnap.forEach((doc) => {
        const v = doc.data();
        const entries = v.entries || [];
        const month = format(new Date(v.date?.seconds * 1000 || Date.now()), "MMM yyyy");

        if (!monthly[month]) monthly[month] = { inflow: 0, outflow: 0 };

        entries.forEach((e: any) => {
          if (e.debit && e.accountType === "cash") inflow += e.debit;
          if (e.credit && e.accountType === "cash") outflow += e.credit;

          if (e.debit && e.accountType === "cash") monthly[month].inflow += e.debit;
          if (e.credit && e.accountType === "cash") monthly[month].outflow += e.credit;
        });
      });

      const formatted = Object.entries(monthly).map(([month, values]) => ({
        month,
        inflow: values.inflow,
        outflow: values.outflow,
        net: values.inflow - values.outflow,
      }));

      setData(formatted);
      setSummary({
        inflow,
        outflow,
        net: inflow - outflow,
      });
    }

    loadCashFlow();
  }, []);

  const COLORS = ["#16a34a", "#dc2626"];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ArrowRightLeft className="text-primary" /> تقرير التدفق النقدي
      </h1>

      {/* البطاقات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="التدفقات الداخلة" value={summary.inflow} icon={TrendingUp} color="text-green-600" />
        <StatCard title="التدفقات الخارجة" value={summary.outflow} icon={TrendingDown} color="text-red-600" />
        <StatCard
          title="صافي التدفق"
          value={summary.net}
          icon={ArrowRightLeft}
          color={summary.net >= 0 ? "text-blue-600" : "text-red-500"}
        />
      </div>

      {/* المخطط الخطي */}
      <Card>
        <CardHeader>
          <CardTitle>التدفق الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="inflow" stroke="#16a34a" strokeWidth={2} name="التدفقات الداخلة" />
              <Line type="monotone" dataKey="outflow" stroke="#dc2626" strokeWidth={2} name="التدفقات الخارجة" />
              <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="صافي التدفق" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* تحليل الإيرادات مقابل المصروفات */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل التدفقات حسب النوع</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="80%" height={300}>
            <RChart>
              <Pie
                data={[
                  { name: "الداخلة", value: summary.inflow },
                  { name: "الخارجة", value: summary.outflow },
                ]}
                cx="50%"
                cy="50%"
                label
                outerRadius={120}
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </RChart>
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
