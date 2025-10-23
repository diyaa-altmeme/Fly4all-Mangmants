
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { format } from "date-fns";

export default function AIAuditAssistantPage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalVouchers: 0,
    balanced: 0,
    unbalanced: 0,
    risky: 0,
  });

  useEffect(() => {
    async function runAuditAnalysis() {
      const vouchersRef = collection(db, "journal-vouchers");
      const vouchersSnap = await getDocs(vouchersRef);

      const results: any[] = [];
      let balanced = 0,
        unbalanced = 0,
        risky = 0;

      vouchersSnap.forEach((doc) => {
        const v = doc.data();
        const entries = v.entries || [];
        const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
        const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
        const diff = Math.abs(totalDebit - totalCredit);
        const date = v.date?.seconds ? new Date(v.date.seconds * 1000) : new Date();

        let status = "balanced";
        let risk = 0;

        if (diff !== 0) {
          status = "unbalanced";
          unbalanced++;
          risk = 80;
        } else if (entries.some((e: any) => e.amount > 50000)) {
          status = "risky";
          risky++;
          risk = 60;
        } else {
          balanced++;
        }

        results.push({
          id: doc.id,
          date: format(date, "dd MMM yyyy"),
          totalDebit,
          totalCredit,
          diff,
          status,
          risk,
        });
      });

      setAudit(results);
      setSummary({
        totalVouchers: vouchersSnap.size,
        balanced,
        unbalanced,
        risky,
      });
    }

    runAuditAnalysis();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Brain className="text-primary" /> التحليل الذكي المالي (AI Audit Assistant)
      </h1>

      {/* ملخص النتائج */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي القيود" value={summary.totalVouchers} icon={Brain} color="text-gray-700" />
        <StatCard title="القيود السليمة" value={summary.balanced} icon={CheckCircle} color="text-green-600" />
        <StatCard title="القيود غير المتوازنة" value={summary.unbalanced} icon={AlertTriangle} color="text-red-600" />
        <StatCard title="عمليات عالية الخطورة" value={summary.risky} icon={TrendingDown} color="text-orange-600" />
      </div>

      {/* مخطط الأداء */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل توازن القيود</CardTitle>
          <CardDescription>الفرق بين المبالغ المدينة والدائنة على مدار الأشهر</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={audit}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalDebit" stroke="#16a34a" name="المدين" />
              <Line type="monotone" dataKey="totalCredit" stroke="#2563eb" name="الدائن" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* توزيع المخاطر */}
      <Card>
        <CardHeader>
          <CardTitle>مستويات المخاطر</CardTitle>
          <CardDescription>توزيع القيود حسب مستوى الخطورة</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={audit}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="risk" fill="#f59e0b" name="نسبة الخطورة" />
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
        <div className="text-2xl font-bold text-right">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
