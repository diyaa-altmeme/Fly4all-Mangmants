
'use server';

import { getDb } from "@/lib/firebase-admin";
import type { DistributedReceiptInput } from './schema';
import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import type { AppSettings, JournalEntry } from "@/lib/types";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { postJournalEntry } from "@/lib/finance/postJournal";


export async function createDistributedVoucher(data: DistributedReceiptInput) {
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user)) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const appSettings = await getSettings();
        const distributedVoucherSettings = appSettings.voucherSettings?.distributed;

        if (!distributedVoucherSettings) {
            return { success: false, error: "Distributed voucher settings are not configured." };
        }
        
        const entries: JournalEntry[] = [];

        // 1. The entire received amount goes into the main box (Debit).
        entries.push({
            accountId: data.boxId,
            debit: data.totalAmount,
            credit: 0,
            currency: data.currency,
            description: `استلام إجمالي مبلغ من ${data.accountId}`
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
        
        const invoiceNumber = await getNextVoucherNumber('DS');

        const voucherId = await postJournalEntry({
            sourceType: 'distributed_receipt',
            sourceId: `dist-receipt-${Date.now()}`,
            description: mainDescription,
            date: data.date,
            entries: entries,
            invoiceNumber,
            meta: { ...data, details: mainDescription, invoiceNumber }
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
    // This is complex because it requires reversing the old journal entry
    // and creating a new one. For now, we just update the originalData for reference.
    // A more robust implementation would require a full ledger adjustment.
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    await db.collection('journal-vouchers').doc(voucherId).update({
        'originalData': { ...data, date: data.date.toISOString() },
        'notes': `(تعديل) ${data.details || ''}`.trim(),
        'updatedAt': new Date().toISOString()
    });
     revalidatePath("/accounts/vouchers/list");
    return { success: true };
}
