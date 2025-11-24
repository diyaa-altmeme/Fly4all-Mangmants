
'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { DistributedReceiptInput } from './schema';
import { getCurrentUserFromSession } from "@/app/(auth)/actions";
import { revalidatePath } from "next/cache";
import type { AppSettings } from "@/lib/types";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";
import type { JournalEntry } from "@/lib/finance/postJournal";


export async function createDistributedVoucher(data: DistributedReceiptInput) {
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user) || !user.boxId) {
        return { success: false, error: "User not authenticated or box not assigned." };
    }

    try {
        const appSettings = await getSettings();
        const distributedVoucherSettings = appSettings.voucherSettings?.distributed;

        if (!distributedVoucherSettings) {
            return { success: false, error: "Distributed voucher settings are not configured." };
        }
        
        const entries: JournalEntry[] = [];
        const totalAmount = Number(data.totalAmount) || 0;

        // 1. Debit the cash box with the total amount received.
        entries.push({
            accountId: data.boxId,
            debit: totalAmount,
            credit: 0,
            currency: data.currency,
            description: `استلام إجمالي مبلغ موزع من ${data.accountId}`
        });

        // 2. The portion that settles the client's debt is credited to their account.
        if (data.companyAmount > 0) {
            entries.push({
                accountId: data.accountId,
                debit: 0,
                credit: data.companyAmount,
                currency: data.currency,
                description: `تسوية جزء من حساب العميل`,
                relationId: data.accountId,
            });
        }
        
        // 3. The distributed amounts are credited to their respective accounts.
        Object.entries(data.distributions || {})
            .forEach(([channelId, distData]) => {
                 if (distData?.amount && Number(distData.amount) > 0) {
                    const channelSettings = distributedVoucherSettings.distributionChannels?.find(c => c.id === channelId);
                    if (!channelSettings?.accountId) {
                        throw new Error(`Account ID for distribution channel "${channelSettings?.label}" is not configured.`);
                    }
                    const description = `توزيع إلى: ${channelSettings?.label || 'حساب توزيع'}`;
                    entries.push({
                        accountId: channelSettings.accountId,
                        debit: 0,
                        credit: Number(distData.amount),
                        currency: data.currency,
                        description: description,
                    });
                }
            });
        
        const mainDescription = `سند قبض موزع: ${data.details || 'تفاصيل غير مذكورة'}`;

        const { voucherId } = await recordFinancialTransaction({
            sourceType: 'distributed_receipt',
            date: data.date,
            currency: data.currency,
            amount: totalAmount,
            description: mainDescription,
            // These are placeholders for the new system, entries array is the source of truth
            debitAccountId: data.boxId,
            creditAccountId: data.accountId,
        }, {
            actorId: user.uid,
            actorName: user.name,
            meta: { ...data, entries }, // Pass the real multi-legged entries in meta
            auditDescription: `أنشأ سند قبض موزع بمبلغ ${totalAmount} ${data.currency}`,
        });
        
        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, newVoucher: { id: voucherId, ...data } };

    } catch (error: any) {
        console.error("Error creating balanced entry from distributed: ", error.message);
        return { success: false, error: error.message };
    }
}

export async function updateDistributedVoucher(voucherId: string, data: DistributedReceiptInput) {
    // This function needs to be rewritten to support the new multi-legged journal entry logic.
    // For now, it's a placeholder. A full implementation would require deleting the old voucher and creating a new one.
    return { success: false, error: "Updating distributed vouchers is not fully implemented yet." };
}

