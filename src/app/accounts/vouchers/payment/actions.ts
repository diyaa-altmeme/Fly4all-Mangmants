
'use server';

import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";


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

    const description = `سند دفع: ${data.details || `لغرض ${data.purpose}`}`.trim();
    const sourceId = `payment-${Date.now()}`;

    try {
        const { voucherId } = await recordFinancialTransaction({
            companyId: data.toSupplierId,
            sourceType: 'payment',
            sourceId,
            date: data.date,
            currency: data.currency,
            debitAccountId: data.toSupplierId,
            creditAccountId: data.boxId,
            amount: data.amount,
            description,
            reference: data.details,
            createdBy: user.uid,
        }, {
            actorId: user.uid,
            actorName: user.name,
            auditDescription: `أنشأ سند دفع بمبلغ ${data.amount} ${data.currency}.`,
            auditTargetType: 'VOUCHER',
            meta: {
                purpose: data.purpose,
                details: data.details,
                exchangeRate: data.exchangeRate,
            },
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, voucherId };
    } catch (error: any) {
        console.error("Error creating payment voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
