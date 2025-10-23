
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { createNotification } from "@/app/notifications/actions";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";
import { postJournalEntry } from "@/lib/finance/postJournal";

interface StandardReceiptData {
    date: string;
    from: string;
    toBox: string;
    amount: number;
    currency: 'USD' | 'IQD';
    details?: string;
}

export async function createStandardReceipt(data: StandardReceiptData) {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }
    
    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }
    
    try {
        const voucherId = await postJournalEntry({
            sourceType: "standard_receipt",
            sourceId: `receipt-${Date.now()}`,
            description: `سند قبض: ${data.details || 'دفعة'}`.trim(),
            amount: data.amount,
            currency: data.currency,
            date: new Date(data.date),
            userId: user.uid,
            debitAccountId: data.toBox,
            creditAccountId: data.from,
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ سند قبض عادي بمبلغ ${data.amount} ${data.currency}.`,
            targetId: voucherId
        });

        // Notify the client if the payment was from a client
        await createNotification({
            userId: data.from, // The 'from' field holds the client's ID
            title: `تم استلام دفعة منك`,
            body: `تم استلام دفعة جديدة بمبلغ ${data.amount} ${data.currency}.`,
            type: 'payment',
            link: `/clients/${data.from}`
        });
        
        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, voucherId };
    } catch (error: any) {
        console.error("Error creating standard receipt: ", String(error));
        return { success: false, error: error.message };
    }
}
