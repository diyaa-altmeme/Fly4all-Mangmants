
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface PostJournalParams {
  sourceType: string; // booking | visa | subscription | segment
  sourceId: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  userId?: string;
  // Optional params for more complex entries
  debitAccountId?: string;
  creditAccountId?: string;
}

export async function postJournalEntry({
  sourceType,
  sourceId,
  description,
  amount,
  currency,
  date,
  userId,
  debitAccountId,
  creditAccountId,
}: PostJournalParams) {
  const db = await getDb();

  // 1. Fetch finance settings
  const settingsDoc = await db.collection("settings").doc("app").get();
  const settings = settingsDoc.data()?.financeAccountsSettings;

  if (!settings) {
    throw new Error("Finance settings (financeAccountsSettings) not found in settings/app document!");
  }

  // 2. Determine accounts based on operation type
  let debitAccount: string | null = debitAccountId || null;
  let creditAccount: string | null = creditAccountId || null;

  if (!debitAccount || !creditAccount) {
    const preventDirectCash = settings.preventDirectCashProfit ?? false;

    switch (sourceType) {
      case "booking":
      case "ticket":
      case "visa":
      case "subscription":
      case "segment":
        creditAccount = settings.defaultRevenueAccount;
        debitAccount = preventDirectCash
          ? settings.defaultReceivableAccount
          : settings.defaultCashAccount;
        break;

      case "manualExpense":
        debitAccount = settings.defaultExpenseAccount;
        creditAccount = settings.defaultCashAccount; // Assuming expenses are paid from cash by default
        break;
        
      // Add more cases for other types like "salary", "asset_purchase", etc.

      default:
        // Fallback for undefined types
        debitAccount = settings.defaultReceivableAccount;
        creditAccount = settings.defaultRevenueAccount;
    }
  }

  if (!debitAccount || !creditAccount) {
    console.error("Debit or Credit account could not be determined.", { sourceType, settings });
    throw new Error(`Could not determine debit/credit accounts for sourceType '${sourceType}'. Check finance settings.`);
  }

  // 3. Create the journal voucher
  const voucherRef = db.collection("journal-vouchers").doc();
  const newVoucher = {
    date: date.toISOString(),
    voucherType: "auto_journal",
    currency,
    debitEntries: [{ accountId: debitAccount, amount, description }],
    creditEntries: [{ accountId: creditAccount, amount, description }],
    sourceType,
    sourceId,
    sourceRoute: `/${sourceType}s/${sourceId}`,
    isConfirmed: true,
    isAudited: false,
    createdBy: userId || "system",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await voucherRef.set(newVoucher);

  console.log(`✅ Posted journal for ${sourceType} (${sourceId}) amount: ${amount}`);
  return voucherRef.id;
}
