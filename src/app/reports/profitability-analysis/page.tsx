

"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BarChart2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { normalizeFinanceAccounts } from "@/lib/finance/finance-accounts";
import { enrichVoucherEntries } from "@/lib/finance/account-categories";
import { db } from "@/lib/firebase";

export default function ProfitabilityAnalysisPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function analyzeProfitability() {
      const [settingsSnap, vouchersSnap, clientsSnap] = await Promise.all([
        getDoc(doc(db, "settings", "app_settings")),
        getDocs(collection(db, "journal-vouchers")),
        getDocs(collection(db, "clients")),
      ]);

      const finance = normalizeFinanceAccounts(settingsSnap.data()?.financeAccounts);

      const clientsMap = new Map(clientsSnap.docs.map(doc => [doc.id, doc.data().name]));

      const analysis: Record<string, { revenue: number, expense: number, profit: number, clientName: string }> = {};

      vouchersSnap.forEach((doc) => {
        const voucher = doc.data();
        const clientId = voucher.clientId;

        if (!clientId) return;

        if (!analysis[clientId]) {
          analysis[clientId] = { 
            revenue: 0, 
            expense: 0, 
            profit: 0, 
            clientName: clientsMap.get(clientId) || "غير معروف"
          };
        }

        const entries = enrichVoucherEntries(voucher, finance);
        entries.forEach((entry: any) => {
          if (entry.accountType === 'revenue') {
            analysis[clientId].revenue += entry.credit || 0;
          } else if (entry.accountType === 'expense') {
            analysis[clientId].expense += entry.debit || 0;
          }
        });
      });

      const formattedData = Object.entries(analysis).map(([clientId, values]) => {
        const profit = values.revenue - values.expense;
        return { ...values, id: clientId, profit };
      });

      setData(formattedData);
    }

    analyzeProfitability();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart2 className="text-primary" /> تحليل الربحية حسب العميل
      </h1>
      <CardDescription>
        تحليل صافي الربح لكل عميل بناءً على الإيرادات والمصروفات المرتبطة به في القيود المحاسبية.
      </CardDescription>

      <Card>
        <CardHeader>
          <CardTitle>جدول تحليل الربحية</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} filterKey="clientName" />
        </CardContent>
      </Card>
    </div>
  );
}

