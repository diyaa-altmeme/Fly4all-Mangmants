
'use server';

import { getDb } from "@/lib/firebase-admin";
import type { DistributedReceiptInput } from './schema';
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { revalidatePath } from "next/cache";
import type { AppSettings, JournalEntry, JournalVoucher } from "@/lib/types";
import { getSettings } from "@/app/settings/actions";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";


export async function createDistributedVoucher(data: DistributedReceiptInput) {
    const user = await getCurrentUserFromSession();
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }

    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const appSettings = (await getSettings()) as AppSettings;
        const distributedVoucherSettings = appSettings.voucherSettings?.distributed;

        if (!distributedVoucherSettings) {
            return { success: false, error: "Distributed voucher settings are not configured." };
        }
        
        const officerName = user.name || 'System';
        const batch = db.batch();
        
        const journalVoucherRef = db.collection('journal-vouchers').doc();
        const invoiceNumber = await getNextVoucherNumber('DS');
        
        const creditEntries: JournalEntry[] = [];
        const debitEntries: JournalEntry[] = [];

        // The entire received amount goes into the main box.
        debitEntries.push({
            accountId: data.boxId,
            amount: data.totalAmount,
            description: `استلام إجمالي مبلغ من ${data.accountId}` // Will be resolved to name later
        });

        // The portion that settles the client's debt is credited to their account.
        if (data.companyAmount > 0) {
            creditEntries.push({
                accountId: data.accountId,
                amount: data.companyAmount,
                description: `تسوية جزء من حسابهم`,
            });
        }
        
        // The distributed amounts are credited to their respective accounts.
        Object.entries(data.distributions)
            .filter(([, distData]) => distData?.enabled && distData?.amount > 0)
            .forEach(([channelId, distData]) => {
                const channelSettings = distributedVoucherSettings.distributionChannels?.find(c => c.id === channelId);
                creditEntries.push({
                    accountId: channelSettings?.accountId || 'unknown_distribution_account',
                    amount: Number(distData.amount),
                    description: `توزيع إلى ${channelSettings?.label || 'حساب توزيع'}`
                });
            });
        
        // Ensure the journal entry is balanced.
        const totalCredit = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
        if (Math.abs(totalCredit - data.totalAmount) > 0.01) {
           return { success: false, error: "مجموع مبالغ التوزيع وحصة الشركة لا يساوي المبلغ المستلم." };
        }
        
        const dataToSave = {
            ...data,
            date: data.date.toISOString(),
        }
        
        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: data.date.toISOString(),
            currency: data.currency,
            exchangeRate: data.exchangeRate || null,
            notes: data.notes || '',
            createdBy: user.uid,
            officer: officerName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_distributed_receipt",
            debitEntries: debitEntries,
            creditEntries: creditEntries,
            isAudited: false,
            isConfirmed: false,
            originalData: dataToSave, 
        });

        batch.update(db.collection('clients').doc(data.accountId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('boxes').doc(data.boxId), { useCount: FieldValue.increment(1) });
        
        const clientDoc = await db.collection('clients').doc(data.accountId).get();
        const clientName = clientDoc.data()?.name || data.accountId;

        await batch.commit();
        
        await createAuditLog({
            userId: user.uid,
            userName: officerName,
            action: 'CREATE',
            targetType: 'VOUCHER',
            targetId: journalVoucherRef.id,
            description: `أنشأ سند قبض مخصص للعميل ${clientName} برقم ${invoiceNumber} بمبلغ ${data.totalAmount} ${data.currency}.`,
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, newVoucher: { id: journalVoucherRef.id, ...dataToSave } };

    } catch (error: any) {
        console.error("Error creating balanced entry from distributed: ", error.message);
        return { success: false, error: error.message };
    }
}

export async function updateDistributedVoucher(voucherId: string, data: DistributedReceiptInput) {
    const user = await getCurrentUserFromSession();
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    // This logic is nearly identical to create, but it updates an existing document.
    // It's a full overwrite of the journal entry based on new form data.
     try {
        const appSettings = (await getSettings()) as AppSettings;
        const distributedVoucherSettings = appSettings.voucherSettings?.distributed;

        if (!distributedVoucherSettings) {
            return { success: false, error: "Distributed voucher settings are not configured." };
        }
        
        const journalVoucherRef = db.collection('journal-vouchers').doc(voucherId);
        
        const creditEntries: JournalEntry[] = [];
        const debitEntries: JournalEntry[] = [];

        debitEntries.push({
            accountId: data.boxId,
            amount: data.totalAmount,
            description: `استلام إجمالي مبلغ من ${data.accountId}`
        });

        if (data.companyAmount > 0) {
            creditEntries.push({
                accountId: data.accountId,
                amount: data.companyAmount,
                description: `تسوية جزء من حسابهم`,
            });
        }
        
        Object.entries(data.distributions)
            .filter(([, distData]) => distData?.enabled && distData?.amount > 0)
            .forEach(([channelId, distData]) => {
                const channelSettings = distributedVoucherSettings.distributionChannels?.find(c => c.id === channelId);
                creditEntries.push({
                    accountId: channelSettings?.accountId || 'unknown_distribution_account',
                    amount: Number(distData.amount),
                    description: `توزيع إلى ${channelSettings?.label || 'حساب توزيع'}`
                });
            });
        
        const totalCredit = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
        if (Math.abs(totalCredit - data.totalAmount) > 0.01) {
           return { success: false, error: "مجموع مبالغ التوزيع وحصة الشركة لا يساوي المبلغ المستلم." };
        }
        
        const dataToSave = {
            ...data,
            date: data.date.toISOString(),
        }
        
        await journalVoucherRef.update({
            date: data.date.toISOString(),
            currency: data.currency,
            exchangeRate: data.exchangeRate || null,
            notes: data.notes || '',
            debitEntries: debitEntries,
            creditEntries: creditEntries,
            originalData: dataToSave,
            updatedAt: new Date().toISOString(),
        });
        
        const clientDoc = await db.collection('clients').doc(data.accountId).get();
        const clientName = clientDoc.data()?.name || data.accountId;

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'VOUCHER',
            targetId: voucherId,
            description: `عدل سند القبض المخصص للعميل ${clientName}.`,
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true };

    } catch (error: any) {
        console.error("Error updating balanced entry from distributed: ", error.message);
        return { success: false, error: error.message };
    }
}
