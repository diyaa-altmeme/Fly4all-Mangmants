
import { getSettings } from "@/app/settings/actions";
import { getDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const inferAccountType = (accountId: string | undefined, finance: any): string => {
  if (!accountId) return 'other';
  if (accountId === finance.receivableAccountId) return 'client';
  if (accountId === finance.payableAccountId) return 'supplier';
  if (accountId === finance.cashAccountId || accountId === finance.defaultCashId) return 'cash';
  if (accountId === finance.bankAccountId || accountId === finance.defaultBankId) return 'bank';
  if (accountId === finance.revenueAccountId || Object.values(finance.revenueMap || {}).includes(accountId)) return 'revenue';
  if (Object.values(finance.expenseMap || {}).includes(accountId)) return 'expense';
  return 'other';
};

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

  const currency = settings?.currencySettings?.defaultCurrency || 'USD';
  const voucherRef = db.collection("journal-vouchers").doc();

  const debitEntry = {
    accountId: finalDebitAccount,
    amount,
    description,
    currency,
    accountType: inferAccountType(finalDebitAccount, finance),
  };

  const creditEntry = {
    accountId: finalCreditAccount,
    amount,
    description,
    currency,
    accountType: inferAccountType(finalCreditAccount, finance),
  };

  const entries = [
    {
      accountId: finalDebitAccount,
      debit: amount,
      credit: 0,
      amount,
      description,
      currency,
      accountType: debitEntry.accountType,
      type: 'debit' as const,
    },
    {
      accountId: finalCreditAccount,
      debit: 0,
      credit: amount,
      amount,
      description,
      currency,
      accountType: creditEntry.accountType,
      type: 'credit' as const,
    },
  ];

  await voucherRef.set({
    id: voucherRef.id,
    invoiceNumber: `${sourceType?.toUpperCase?.() || 'JE'}-${Date.now()}`,
    date: date.toISOString(),
    currency,
    notes: description,
    createdBy: userId || 'system',
    officer: userId || 'system',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    voucherType: `journal_from_${sourceType}`,
    sourceType,
    sourceId,
    debitEntries: [debitEntry],
    creditEntries: [creditEntry],
    isAudited: false,
    isConfirmed: true,
    entries,
    originalData: { category, amount, description },
  });
}
