
import { getDb } from "@/lib/firebase-admin";
import { getSettings } from "@/app/settings/actions";
import { NextResponse } from 'next/server';
import { normalizeFinanceAccounts } from '@/lib/finance/finance-accounts';

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
        return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }
    const settings = await getSettings();
    const finance = normalizeFinanceAccounts(settings.financeAccounts);
    if (!finance.receivableAccountId || !finance.generalRevenueId) {
         return NextResponse.json({ error: "Finance settings not configured" }, { status: 500 });
    }

    const journalsSnap = await db.collection("journals").get();

    let entries: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    journalsSnap.forEach((doc) => {
      const j = doc.data();
      j.entries.forEach((e: any) => {
        if (e.type === "credit" && e.accountId.startsWith(finance.generalRevenueId)) {
          totalRevenue += e.amount;
          entries.push({
            ...e,
            type: "revenue",
            date: j.date.toDate(),
            description: j.description,
          });
        }
        else if (e.type === "debit" && e.accountId.startsWith(finance.generalExpenseId)) {
          totalExpense += e.amount;
          entries.push({
            ...e,
            type: "expense",
            date: j.date.toDate(),
            description: j.description,
          });
        }
      });
    });

    const profit = totalRevenue - totalExpense;

    return NextResponse.json({
      entries,
      totals: { revenue: totalRevenue, expense: totalExpense, profit },
    });
  } catch (error: any) {
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
