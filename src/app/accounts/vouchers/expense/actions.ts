
'use server';

import { getCurrentUserFromSession } from "@/lib/auth/actions";
import { revalidatePath } from "next/cache";
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";

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
    
    try {
        const description = `مصروف ${data.expenseType}: ${data.notes || ''}`.trim();
        const sourceId = `expense-${Date.now()}`;

        const { voucherId } = await recordFinancialTransaction({
            companyId: data.payee,
            sourceType: 'manualExpense',
            sourceId,
            date: data.date,
            currency: data.currency,
            debitAccountId: `expense_${data.expenseType}`,
            creditAccountId: data.boxId,
            amount: data.amount,
            description,
            reference: data.notes,
            createdBy: user.uid,
        }, {
            actorId: user.uid,
            actorName: user.name,
            auditDescription: `أنشأ سند مصاريف بمبلغ ${data.amount} ${data.currency}.`,
            auditTargetType: 'VOUCHER',
            meta: {
                expenseType: data.expenseType,
                payeeId: data.payee,
                exchangeRate: data.exchangeRate,
                notes: data.notes,
            },
        });

        revalidatePath("/accounts/vouchers/list");
        revalidatePath("/reports/account-statement");

        return { success: true, voucherId };
    } catch (error: any) {
        console.error("Error creating expense voucher: ", String(error));
        return { success: false, error: error.message };
    }
}
