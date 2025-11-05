
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';


// This function is kept for any potential remaining dependencies,
// but the main logic is now in log/actions.ts
export async function getVouchers() {
  return [];
}

export async function getVoucherById(id: string): Promise<JournalVoucher | null> {
    const db = await getDb();
    if (!db) return null;
    const doc = await db.collection('journal-vouchers').doc(id).get();
    if (!doc.exists) return null;

    const data = doc.data() as any;
    // Simple serialization for dates
    if (data.date && data.date.toDate) data.date = data.date.toDate().toISOString();
    if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate().toISOString();
    if (data.updatedAt && data.updatedAt.toDate) data.updatedAt = data.updatedAt.toDate().toISOString();

    return { id: doc.id, ...data } as JournalVoucher;
}

export async function updateVoucher(id: string, data: any) {
    const db = await getDb();
    if(!db) return { success: false, error: 'DB not connected' };

    try {
        await db.collection('journal-vouchers').doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
        });
        revalidatePath('/accounts/vouchers/list');
        revalidatePath('/accounts/vouchers/log');
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteVoucher(id: string): Promise<{ success: boolean, error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    await db.collection('journal-vouchers').doc(id).update({ isDeleted: true });
    revalidatePath('/accounts/vouchers/list');
    revalidatePath('/accounts/vouchers/log');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
