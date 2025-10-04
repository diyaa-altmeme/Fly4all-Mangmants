
'use server';

import { getDb } from "@/lib/firebase-admin";
import { getCurrentUserFromSession } from "@/app/auth/actions";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "@/lib/sequences";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/app/system/activity-log/actions";


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

    const db = await getDb();
    if (!db) {
        return { success: false, error: "Database not available." };
    }
    const batch = db.batch();
    
    try {
        const journalVoucherRef = db.collection("journal-vouchers").doc();
        const invoiceNumber = await getNextVoucherNumber('PV');
        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: data.date,
            currency: data.currency,
            exchangeRate: data.exchangeRate || null,
            notes: data.details || ``,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "journal_from_payment",
            debitEntries: [{
                accountId: data.toSupplierId,
                amount: data.amount,
                description: 'استلام دفعة'
            }],
            creditEntries: [{
                accountId: data.boxId,
                amount: data.amount,
                description: 'دفع مبلغ'
            }],
            isAudited: false,
            isConfirmed: false,
             originalData: data,
        });

        batch.update(db.collection('clients').doc(data.toSupplierId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('boxes').doc(data.boxId), { useCount: FieldValue.increment(1) });
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أنشأ سند دفع برقم ${invoiceNumber} بمبلغ ${data.amount} ${data.currency}.`,
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true };
    } catch (error: any) {
        console.error("Error creating payment voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
