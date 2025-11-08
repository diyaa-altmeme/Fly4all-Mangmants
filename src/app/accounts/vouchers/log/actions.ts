
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher } from '@/lib/types';
import { normalizeVoucherType } from '@/lib/accounting/voucher-types';

export type Voucher = JournalVoucher & {
  voucherId: string;
};

// This function now only fetches the raw voucher data.
// The complex mapping and enrichment will happen on the client-side
// to reduce server load and prevent crashes.
export async function getAllVouchers(): Promise<Voucher[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection('journal-vouchers')
            .orderBy('createdAt', 'desc')
            .limit(1000) // Limit to a reasonable number for performance
            .get();

        if (snapshot.empty) return [];

        const vouchers = snapshot.docs.map(doc => {
            const data = doc.data() as JournalVoucher;
            // Basic serialization
             const safeData = JSON.parse(JSON.stringify({ ...data, id: doc.id, voucherId: doc.id }));
            
            if (safeData.date && (safeData.date._seconds || typeof safeData.date.toDate === 'function')) {
                safeData.date = (safeData.date.toDate ? safeData.date.toDate() : new Date(safeData.date._seconds * 1000)).toISOString();
            }
            if (safeData.createdAt && (safeData.createdAt._seconds || typeof safeData.createdAt.toDate === 'function')) {
                safeData.createdAt = (safeData.createdAt.toDate ? safeData.createdAt.toDate() : new Date(safeData.createdAt._seconds * 1000)).toISOString();
            }

            return safeData as Voucher;
        });

        return vouchers;

    } catch (error) {
        console.error("Error getting all vouchers:", String(error));
        // Re-throw the error to be caught by the page component
        throw new Error(`Failed to fetch vouchers. A database index might be required. Original error: ${String(error)}`);
    }
}
