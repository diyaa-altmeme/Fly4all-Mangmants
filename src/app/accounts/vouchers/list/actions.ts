
'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/app/system/activity-log/actions';
import { getCurrentUserFromSession } from '@/app/(auth)/actions';
import { softDeleteVoucherRecord } from '@/lib/finance/voucher-lifecycle';

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
        revalidatePath('/accounts/vouchers/log');
        revalidatePath('/accounts/vouchers/list');
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteVoucher(id: string): Promise<{ success: boolean, error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user || !('name' in user)) return { success: false, error: "User not authenticated." };


  try {
    const voucherRef = db.collection('journal-vouchers').doc(id);
    const voucherSnap = await voucherRef.get();
    if (!voucherSnap.exists) {
        return { success: false, error: 'Voucher not found.' };
    }

    const voucherData = voucherSnap.data() as JournalVoucher;
    const deletedAt = new Date().toISOString();
    const deletedBy = user.name || user.uid;

    await softDeleteVoucherRecord({
        db,
        voucherId: id,
        deletedBy,
        deletedById: user.uid,
        deletedAt,
    });

    if (voucherData.sourceType && voucherData.sourceId) {
        const sourceCollection = `${voucherData.sourceType}s`;
        const sourceRef = db.collection(sourceCollection).doc(voucherData.sourceId);
        const sourceSnap = await sourceRef.get();
        if (sourceSnap.exists) {
            await sourceRef.update({
                isDeleted: true,
                deletedAt,
                deletedBy,
            });
        }
    }

    await createAuditLog({
        userId: user.uid,
        userName: user.name,
        action: 'DELETE',
        targetType: 'VOUCHER',
        targetId: id,
        description: `حذف السند رقم ${id}`,
    });
    
    revalidatePath('/accounts/vouchers/log');
    revalidatePath('/accounts/vouchers/list');
    revalidatePath('/reports/account-statement');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
