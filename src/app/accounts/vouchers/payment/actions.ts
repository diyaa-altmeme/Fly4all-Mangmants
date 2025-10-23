
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { postJournalEntry } from "@/lib/finance/postJournal";


interface PaymentVoucherData {
    date: string;
    toSupplierId: string;
    amount: number;
    currency: 'USD' | 'IQD';
    boxId: string;
    purpose: 'tickets' | 'services';
    details?: string;
    exchangeRate?: number;
}

export async function createPaymentVoucher(data: PaymentVoucherData) {
     const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const voucherId = await postJournalEntry({
            sourceType: "payment",
            sourceId: `payment-${Date.now()}`,
            description: `سند دفع: ${data.details || `لغرض ${data.purpose}`}`,
            amount: data.amount,
            currency: data.currency,
            date: new Date(data.date),
            userId: user.uid,
            debitAccountId: data.toSupplierId,
            creditAccountId: data.boxId,
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ سند دفع بمبلغ ${data.amount} ${data.currency}.`,
            targetId: voucherId,
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, voucherId };
    } catch (error: any) {
        console.error("Error creating payment voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
