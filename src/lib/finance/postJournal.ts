
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import type { JournalVoucher, JournalEntry } from "../types";

interface PostJournalParams {
  sourceType: string;
  sourceId: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  userId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  creditEntries?: JournalEntry[];
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
  creditEntries,
  cost,
  revenueAccountId,
  clientId,
  supplierId,
}: PostJournalParams): Promise<string> {
  const db = await getDb();

  const settingsDoc = await db.collection("settings").doc("app").get();
  const settings = settingsDoc.data()?.financeAccounts;
  if (!settings) {
    throw new Error("Finance settings (financeAccounts) not found in settings/app document!");
  }

  const voucherRef = db.collection("journal-vouchers").doc();
  const newVoucher: Omit<JournalVoucher, 'id'> = {
    invoiceNumber: await getNextVoucherNumber(sourceType.toUpperCase()),
    date: date.toISOString(),
    currency,
    notes: description,
    createdBy: userId || "system",
    officer: userId || 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    voucherType: `journal_from_${sourceType}`,
    debitEntries: [],
    creditEntries: [],
    isAudited: false,
    isConfirmed: true,
    originalData: { sourceType, sourceId, amount, cost: cost || 0 },
  };

  const saleAmount = amount;
  const costAmount = cost || 0;

  if (sourceType === 'segment' && creditEntries) {
    // Special handling for segment entries
    const finalDebitAccount = debitAccountId || clientId || settings.defaultReceivableAccount;
    if (!finalDebitAccount) throw new Error("Missing debit account for segment entry.");
    
    newVoucher.debitEntries.push({ accountId: finalDebitAccount, amount: saleAmount, description: `دين عن: ${description}` });
    
    // Spread the passed credit entries (partner shares + alrawdatain share)
    newVoucher.creditEntries.push(...creditEntries);

  } else if (costAmount > 0) {
    // Compound entry for Sale, Cost, and Profit
    const profitAmount = saleAmount - costAmount;
    const finalClientId = clientId || debitAccountId || settings.defaultReceivableAccount;
    const finalSupplierId = supplierId || costAccountId || settings.defaultPayableAccount;
    
    let finalRevenueAccountId = revenueAccountId;
    if (sourceType === 'booking') finalRevenueAccountId = settings.revenueMap?.['tickets'] || settings.defaultRevenueAccount;
    if (sourceType === 'visa') finalRevenueAccountId = settings.revenueMap?.['visas'] || settings.defaultRevenueAccount;
    if (sourceType === 'subscription') finalRevenueAccountId = settings.revenueMap?.['subscriptions'] || settings.defaultRevenueAccount;

    if (!finalClientId || !finalSupplierId || !finalRevenueAccountId) {
      throw new Error("Missing default accounts for compound entry in finance settings.");
    }
    
    newVoucher.debitEntries.push({ accountId: finalClientId, amount: saleAmount, description: `دين عن: ${description}` });
    newVoucher.creditEntries.push({ accountId: finalSupplierId, amount: costAmount, description: `تكلفة: ${description}` });
    
    if (profitAmount > 0) {
      newVoucher.creditEntries.push({ accountId: finalRevenueAccountId, amount: profitAmount, description: `ربح عن: ${description}` });
    } else if (profitAmount < 0) {
      newVoucher.debitEntries.push({ accountId: settings.defaultExpenseAccount || 'expense_general', amount: Math.abs(profitAmount), description: `خسارة عن: ${description}` });
    }
    
  } else {
    // Simple entry (e.g., receipt, payment, expense)
    const finalDebitAccount = debitAccountId;
    const finalCreditAccount = creditAccountId;
    
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
    console.error("Journal Entry Imbalance Details:", {
        debits: newVoucher.debitEntries,
        credits: newVoucher.creditEntries,
        totalDebit, totalCredit
    });
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
