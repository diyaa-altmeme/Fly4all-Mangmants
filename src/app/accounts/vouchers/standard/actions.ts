
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { createNotification } from "@/app/notifications/actions";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";

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
    const batch = db.batch();
    
    try {
        const journalVoucherRef = db.collection("journal-vouchers").doc();
        const invoiceNumber = await getNextVoucherNumber('RC');
        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: data.date,
            currency: data.currency,
            notes: data.details || '',
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_standard_receipt",
            debitEntries: [{
                accountId: data.toBox,
                amount: data.amount,
                description: 'إيداع في الصندوق'
            }],
            creditEntries: [{
                accountId: data.from,
                amount: data.amount,
                description: 'سداد دفعة'
            }],
            isAudited: false,
            isConfirmed: false,
            originalData: data,
        });

        // Increment use count for client and box
        batch.update(db.collection('clients').doc(data.from), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('boxes').doc(data.toBox), { useCount: FieldValue.increment(1) });

        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ سند قبض عادي برقم ${invoiceNumber} بمبلغ ${data.amount} ${data.currency}.`,
        });

        // Notify the user who created the voucher
        await createNotification({
            userId: user.uid,
            title: `تم إنشاء سند قبض`,
            body: `تم إنشاء سند قبض جديد برقم ${invoiceNumber} بمبلغ ${data.amount} ${data.currency}.`,
            type: 'voucher',
            link: `/accounts/vouchers/list`
        });
        
        // Notify the client if the payment was from a client
        await createNotification({
            userId: data.from, // The 'from' field holds the client's ID
            title: `تم استلام دفعة منك`,
            body: `تم استلام دفعة جديدة منك برقم فاتورة ${invoiceNumber} بمبلغ ${data.amount} ${data.currency}.`,
            type: 'payment',
            link: `/clients/${data.from}`
        });
        
        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true };
    } catch (error: any) {
        console.error("Error creating standard receipt: ", String(error));
        return { success: false, error: error.message };
    }
}
