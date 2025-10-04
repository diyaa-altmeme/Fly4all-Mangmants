
'use server';

import { getDb } from "@/lib/firebase-admin";

interface RemittanceVoucherData {
    officeId: string;
    companyId: string;
    amount: number;
    currency: 'USD' | 'IQD';
    intermediateBoxId: string;
}

export async function createRemittanceVoucher(data: RemittanceVoucherData) {
    try {
        const db = await getDb();
        if (!db) {
            return { success: false, error: "Database not available." };
        }
        await db.collection("receipt-vouchers").add({
            ...data,
            converted: false,
            voucherType: "remittance",
            createdAt: new Date().toISOString(),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
