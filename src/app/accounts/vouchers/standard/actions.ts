
'use server';

import { createAuditLog } from "@/app/system/activity-log/actions";
import { createNotification } from "@/app/notifications/actions";
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";
import { revalidatePath } from "next/cache";
import { getCurrentUserFromSession } from '@/lib/auth/actions';

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
    if (!user || !('role' in user)) {
        return { success: false, error: "User not authenticated." };
    }
    
    try {
        const description = `سند قبض: ${data.details || 'دفعة'}`.trim();
        const sourceId = `receipt-${Date.now()}`;

        const { voucherId } = await recordFinancialTransaction({
            companyId: data.from,
            sourceType: 'standard_receipt',
            sourceId,
            date: data.date,
            currency: data.currency,
            debitAccountId: data.toBox,
            creditAccountId: data.from,
            amount: data.amount,
            description,
            reference: data.details,
        }, {
            actorId: user.uid,
            actorName: user.name,
            auditDescription: `أنشأ سند قبض عادي بمبلغ ${data.amount} ${data.currency}.`,
            auditTargetType: 'VOUCHER',
            meta: {
                payerId: data.from,
                boxId: data.toBox,
                details: data.details,
            },
        });

        await createNotification({
            userId: data.from,
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
