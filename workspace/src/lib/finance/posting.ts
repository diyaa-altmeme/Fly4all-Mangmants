
import { getSettings } from "@/app/settings/actions";
import { getDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function postJournal({
  category,
  amount,
  date,
  description,
  sourceType,
  sourceId,
  debitAccountId,
  creditAccountId,
}: {
  category: string;
  amount: number;
  date: Date;
  description: string;
  sourceType: string;
  sourceId: string;
  debitAccountId?: string;
  creditAccountId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const settings = await getSettings();
  const finance = settings?.financeAccounts;

  if (!finance) throw new Error("لم يتم إعداد مركز التحكم المالي بعد.");

  // تحديد حساب الإيراد حسب نوع العملية
  const revenueAccountId = finance.revenueMap?.[category] || finance.revenueAccountId;

  if (!revenueAccountId) throw new Error(`لم يتم تحديد حساب إيرادات لنوع العملية: ${category}`);

  // إنشاء القيد المحاسبي
  const finalDebitAccount = debitAccountId || finance.receivableAccountId;
  const finalCreditAccount = creditAccountId || revenueAccountId;

  if (finance.blockDirectCashRevenue && finalCreditAccount === finance.cashAccountId) {
    throw new Error("غير مسموح بتسجيل الإيراد مباشرة في الصندوق.");
  }

  const journal = {
    date: Timestamp.fromDate(date),
    entries: [
      { accountId: finalDebitAccount, type: "debit", amount },
      { accountId: finalCreditAccount, type: "credit", amount },
    ],
    description,
    sourceType,
    sourceId,
    createdAt: Timestamp.now(),
  };

  await db.collection("journals").add(journal);
}
