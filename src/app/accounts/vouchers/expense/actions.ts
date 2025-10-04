
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";

interface ExpenseVoucherData {
    date: string;
    expenseType: string;
    amount: number;
    currency: 'USD' | 'IQD';
    payee?: string;
    boxId: string;
    notes?: string;
    exchangeRate?: number;
}

export async function createExpenseVoucher(data: ExpenseVoucherData) {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }
    
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }
    const batch = db.batch();

    try {
        const journalVoucherRef = db.collection("journal-vouchers").doc();
        const invoiceNumber = await getNextVoucherNumber('EX');

        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: data.date,
            currency: data.currency,
            exchangeRate: data.exchangeRate || null,
            notes: data.notes || '',
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_expense",
            debitEntries: [{
                accountId: `expense_${data.expenseType}`, // This should map to a real account in chart of accounts
                amount: data.amount,
                description: `مصروف ${data.expenseType}`
            }],
            creditEntries: [{
                accountId: data.boxId,
                amount: data.amount,
                description: `دفع مصروف ${data.expenseType}`
            }],
            isAudited: false,
            isConfirmed: false,
            originalData: data,
        });

        batch.update(db.collection('boxes').doc(data.boxId), { useCount: FieldValue.increment(1) });
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ سند مصاريف برقم ${invoiceNumber} بمبلغ ${data.amount} ${data.currency}.`,
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true };
    } catch (error: any) {
        console.error("Error creating expense voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
