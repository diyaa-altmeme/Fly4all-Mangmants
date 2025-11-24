
import { getDb } from "@/lib/firebase/firebase-admin-sdk";
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";
import { getFinanceMap } from "@/lib/finance/posting";
import type { SegmentEntry, DistributedReceiptInput } from "@/lib/types";
import { scriptContext } from "@/lib/script-context";

async function fixLegacyVouchers() {
  const db = await getDb();
  const financeMap = await getFinanceMap();
  console.log("🚀 Starting legacy voucher fixing process...");

  // --- 1. Fix Legacy Segment Vouchers ---
  console.log("\n🔍 Auditing and fixing legacy Segment vouchers...");
  const segmentVouchersSnap = await db.collection("journal-vouchers").where("sourceType", "==", "segment").get();
  let fixedSegments = 0;

  for (const doc of segmentVouchersSnap.docs) {
    const voucher = doc.data();
    const segment = voucher.originalData as SegmentEntry;
    
    // Check if it's an old, incorrect entry (e.g., has only two entries)
    if (voucher.entries.length < 3) {
      console.log(`- Found old segment voucher ${doc.id} for company ${segment.companyName}. Correcting...`);
      
      // Delete the old incorrect voucher
      await doc.ref.delete();

      // Re-create the correct set of journal entries for the segment
      // a) The main debt entry (already existed, but we recreate for consistency)
      await recordFinancialTransaction({
        sourceType: 'segment',
        sourceId: segment.id,
        date: voucher.date,
        currency: segment.currency,
        amount: segment.total,
        debitAccountId: segment.clientId,
        creditAccountId: financeMap.clearingAccountId,
        description: `إثبات ربح سكمنت من ${segment.companyName}`,
        companyId: segment.clientId,
        invoiceNumber: voucher.invoiceNumber,
      }, { skipAuditLog: true });

      // b) Payout partner share (this was the missing part)
      if (segment.hasPartner && segment.partnerId && segment.partnerShare > 0) {
        await recordFinancialTransaction({
          sourceType: 'segment_payout',
          sourceId: segment.id,
          date: voucher.date,
          currency: segment.currency,
          amount: segment.partnerShare,
          debitAccountId: financeMap.expenseMap.partners, // Expense for us
          creditAccountId: segment.partnerId, // Liability to partner
          description: `تسجيل حصة الشريك ${segment.partnerName} عن سكمنت ${segment.companyName}`,
          companyId: segment.partnerId,
        }, { skipAuditLog: true });
      }

      // c) Recognize our share of the revenue
      if (segment.alrawdatainShare > 0) {
        await recordFinancialTransaction({
          sourceType: 'segment_revenue',
          sourceId: segment.id,
          date: voucher.date,
          currency: segment.currency,
          amount: segment.alrawdatainShare,
          debitAccountId: financeMap.clearingAccountId, // From clearing
          creditAccountId: financeMap.revenueMap.segments, // To our revenue
          description: `تسجيل حصة الشركة من سكمنت ${segment.companyName}`,
        }, { skipAuditLog: true });
      }
      fixedSegments++;
    }
  }
  console.log(`✅ Fixed ${fixedSegments} legacy segment vouchers.`);


  // --- 2. Fix Legacy Distributed Receipt Vouchers ---
  console.log("\n🔍 Auditing and fixing legacy Distributed Receipt vouchers...");
  const distVouchersSnap = await db.collection("journal-vouchers").where("sourceType", "==", "distributed_receipt").get();
  let fixedDistReceipts = 0;

  for (const doc of distVouchersSnap.docs) {
    const voucher = doc.data();
    const distData = voucher.originalData as DistributedReceiptInput;
    
    // Check if it's an old entry (e.g., only has a simple debit/credit)
    if (voucher.entries.length === 2 && voucher.debitEntries[0].accountId === distData.boxId) {
      console.log(`- Found old distributed receipt ${doc.id}. Correcting...`);
      
      await doc.ref.delete();

      const totalAmount = Number(distData.totalAmount) || 0;
      
      const entries = [];
      // 1. Debit the cash box with the total amount received
      entries.push({
        accountId: distData.boxId,
        debit: totalAmount,
        credit: 0,
        currency: distData.currency,
        description: `استلام إجمالي مبلغ من ${distData.accountId}`,
      });
      
      // 2. Credit the client's account for the portion that settles their debt
      if (distData.companyAmount > 0) {
        entries.push({
          accountId: distData.accountId,
          debit: 0,
          credit: Number(distData.companyAmount),
          currency: distData.currency,
          description: `تسوية جزء من حساب العميل`,
          relationId: distData.accountId,
        });
      }

      // 3. Credit each distribution channel's account
      const appSettings = (await db.collection("settings").doc("app_settings").get()).data();
      const distChannels = appSettings?.voucherSettings?.distributed?.distributionChannels || [];
      
      Object.entries(distData.distributions || {}).forEach(([channelId, distValue]) => {
        const amount = Number((distValue as any).amount) || 0;
        if (amount > 0) {
          const channelSettings = distChannels.find((c: any) => c.id === channelId);
          if (channelSettings?.accountId) {
            entries.push({
              accountId: channelSettings.accountId,
              debit: 0,
              credit: amount,
              currency: distData.currency,
              description: `توزيع إلى: ${channelSettings.label}`,
            });
          }
        }
      });
      
      await recordFinancialTransaction({
          sourceType: 'distributed_receipt',
          sourceId: voucher.sourceId,
          date: voucher.date,
          currency: distData.currency,
          amount: totalAmount, // This is just for the record, entries define the real movement
          debitAccountId: distData.boxId, // Placeholder
          creditAccountId: distData.accountId, // Placeholder
          description: `سند قبض موزع: ${distData.details || ''}`,
      }, {
          meta: { entries } // Pass the real multi-leg entries in meta
      });

      fixedDistReceipts++;
    }
  }
  console.log(`✅ Fixed ${fixedDistReceipts} legacy distributed receipt vouchers.`);

  console.log("\n🎉 All legacy vouchers have been checked and corrected.");
}

async function main() {
  await scriptContext.run({ isScript: true }, fixLegacyVouchers);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
