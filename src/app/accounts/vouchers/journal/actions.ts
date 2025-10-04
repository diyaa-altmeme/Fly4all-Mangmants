
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { createAuditLog } from "@/app/system/activity-log/actions";

interface JournalEntry {
    accountId: string;
    debit: number;
    credit: number;
}

interface JournalVoucherData {
    date: string;
    currency: 'USD' | 'IQD';
    notes: string;
    exchangeRate?: number;
    entries: JournalEntry[];
}

export async function createJournalVoucher(data: JournalVoucherData) {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }
    
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }

    try {
        const journalVoucherRef = db.collection("journal-vouchers").doc();
        const invoiceNumber = await getNextVoucherNumber('JE');
        
        const debitEntries = data.entries
            .filter(e => e.debit > 0)
            .map(e => ({ accountId: e.accountId, amount: e.debit, description: data.notes }));
            
        const creditEntries = data.entries
            .filter(e => e.credit > 0)
            .map(e => ({ accountId: e.accountId, amount: e.credit, description: data.notes }));

        await journalVoucherRef.set({
            invoiceNumber,
            date: data.date,
            currency: data.currency,
            exchangeRate: data.exchangeRate || null,
            notes: data.notes,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_voucher",
            debitEntries: debitEntries,
            creditEntries: creditEntries,
            isAudited: false,
            isConfirmed: false,
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ قيدًا محاسبيًا برقم ${invoiceNumber}.`,
        });
        
        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true };
    } catch (error: any) {
        console.error("Error creating journal voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
