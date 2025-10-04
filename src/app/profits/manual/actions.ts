
'use server';

import { getDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

export interface PartnerShare {
    id: string;
    name: string;
    percentage: number;
    amount: number;
}

export interface ManualProfitData {
    fromDate: string;
    toDate: string;
    profit: number;
    currency: 'USD' | 'IQD';
    partners: PartnerShare[];
}

export async function saveManualProfitDistribution(data: ManualProfitData): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };

    try {
        const monthId = data.fromDate.slice(0, 7); // "YYYY-MM"
        const docRef = db.collection('manual_monthly_profits').doc();

        await docRef.set({
            ...data,
            monthId,
            createdAt: new Date().toISOString()
        });

        revalidatePath('/profit-sharing');
        return { success: true };

    } catch (e: any) {
        console.error("Error saving manual profit distribution:", e);
        return { success: false, error: e.message };
    }
}
