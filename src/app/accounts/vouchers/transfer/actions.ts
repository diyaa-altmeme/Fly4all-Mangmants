
'use server';

import { getDb } from "@/lib/firebase-admin";

interface TransferVoucherData {
    fromBoxId: string;
    toBoxId: string;
    amount: number;
    currency: 'USD' | 'IQD';
    transferNote?: string;
}

export async function createTransferVoucher(data: TransferVoucherData) {
    try {
        const db = await getDb();
        if (!db) {
            return { success: false, error: "Database not available." };
        }
        await db.collection("transfer-vouchers").add({
            ...data,
            voucherType: "transfer",
            createdAt: new Date().toISOString(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
