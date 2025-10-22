
'use server';

import { getSettings } from "@/app/settings/actions";
import type { PostJournalInput } from "@/lib/types";

export async function postJournal(input: PostJournalInput) {
  const settings = await getSettings();
  const fa = settings.financeAccounts;
  if (!fa) throw new Error("لم يتم إعداد مركز التحكم المالي بعد.");

  const category = input.category || "other";
  const revenueAcc = fa.revenueMap[category] || fa.defaultRevenueAccountId;
  const expenseAcc = fa.expenseMap[category] || fa.defaultExpenseAccountId;

  if (fa.enforceRevenueSeparation && input.creditAccountId === fa.defaultCashBoxAccountId) {
    throw new Error("غير مسموح تسجيل الإيراد مباشرة في الصندوق.");
  }

  return {
    date: input.date,
    entries: [
      {
        debitAccountId: input.debitAccountId || fa.arAccountId,
        creditAccountId: input.creditAccountId || revenueAcc,
        amount: input.amount,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceRoute: input.sourceRoute,
      },
    ],
  };
}
