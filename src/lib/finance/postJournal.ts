
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import type { JournalVoucher } from "../types";

interface PostJournalParams {
  sourceType: string; // booking | visa | subscription | segment
  sourceId: string;
  description: string;
  amount: number; // Represents total sale price
  currency: string;
  date: Date;
  userId?: string;
  // Optional params for more complex entries
  debitAccountId?: string;
  creditAccountId?: string;
  // New optional param for cost
  cost?: number;
  costAccountId?: string;
  revenueAccountId?: string;
  clientId?: string;
  supplierId?: string;
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
  cost,
  costAccountId,
  revenueAccountId,
  clientId,
  supplierId,
}: PostJournalParams): Promise<string> {
  const db = await getDb();

  const settingsDoc = await db.collection("settings").doc("app").get();
  const settings = settingsDoc.data()?.financeAccountsSettings;
  if (!settings) {
    throw new Error("Finance settings (financeAccountsSettings) not found in settings/app document!");
  }

  const voucherRef = db.collection("journal-vouchers").doc();
  const newVoucher: Omit<JournalVoucher, 'id'> = {
    invoiceNumber: await getNextVoucherNumber(sourceType.toUpperCase()),
    date: date.toISOString(),
    currency,
    notes: description,
    createdBy: userId || "system",
    officer: userId || 'system', // This should be replaced with actual user name later
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    voucherType: `journal_from_${sourceType}`,
    debitEntries: [],
    creditEntries: [],
    isAudited: false,
    isConfirmed: true, // Auto-confirm system entries
    originalData: { sourceType, sourceId, amount, cost },
  };

  const saleAmount = amount;
  const costAmount = cost || 0;
  const profitAmount = saleAmount - costAmount;

  if (costAmount > 0 && profitAmount > 0) {
    // This is a compound entry for Sale, Cost, and Profit
    const finalClientId = clientId || debitAccountId || settings.defaultReceivableAccount;
    const finalSupplierId = supplierId || costAccountId || settings.defaultPayableAccount;
    const finalRevenueAccountId = revenueAccountId || settings.defaultRevenueAccount;

    if (!finalClientId || !finalSupplierId || !finalRevenueAccountId) {
      throw new Error("Missing default accounts for compound entry in finance settings.");
    }
    
    // 1. Client owes the full sale amount
    newVoucher.debitEntries.push({ accountId: finalClientId, amount: saleAmount, description: `دين عن: ${description}` });
    
    // 2. We owe the supplier the cost amount
    newVoucher.creditEntries.push({ accountId: finalSupplierId, amount: costAmount, description: `تكلفة: ${description}` });
    
    // 3. We record the profit as revenue
    newVoucher.creditEntries.push({ accountId: finalRevenueAccountId, amount: profitAmount, description: `ربح عن: ${description}` });

  } else {
    // Simple entry (e.g., receipt, payment, expense)
    const finalDebitAccount = debitAccountId || settings.defaultReceivableAccount;
    const finalCreditAccount = creditAccountId || settings.defaultRevenueAccount;
    
     if (!finalDebitAccount || !finalCreditAccount) {
      throw new Error(`Could not determine debit/credit accounts for sourceType '${sourceType}'. Check finance settings.`);
    }

    newVoucher.debitEntries.push({ accountId: finalDebitAccount, amount: saleAmount, description });
    newVoucher.creditEntries.push({ accountId: finalCreditAccount, amount: saleAmount, description });
  }
  
  // Validate the entry is balanced
  const totalDebit = newVoucher.debitEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = newVoucher.creditEntries.reduce((sum, e) => sum + e.amount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
  }


  await voucherRef.set({
      ...newVoucher,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Posted journal for ${sourceType} (${sourceId}) amount: ${amount}`);
  return voucherRef.id;
}
