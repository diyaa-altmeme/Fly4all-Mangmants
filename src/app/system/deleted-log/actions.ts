
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { createAuditLog } from '../activity-log/actions';

export type DeletedVoucher = JournalVoucher & {
    voucherId: string;
};

export async function getDeletedVouchers(): Promise<DeletedVoucher[]> {
    const db = await getDb();
    if (!db) return [];
    
    // Querying the deleted-vouchers collection instead
    const snapshot = await db.collection('deleted-vouchers').orderBy('deletedAt', 'desc').get();
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            voucherId: data.voucherId || doc.id, // ensure voucherId exists
        } as DeletedVoucher;
    });
}

export async function restoreVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const writeBatch = db.batch();
    
    try {
        const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);
        const journalVoucherRef = db.collection('journal-vouchers').doc(voucherId);

        const deletedDoc = await deletedVoucherRef.get();
        if (!deletedDoc.exists) {
            // If it's not in deleted-vouchers, it might have been restored already.
            // Let's ensure the main voucher is marked as not deleted.
             await journalVoucherRef.update({ isDeleted: false, deletedAt: FieldValue.delete(), deletedBy: FieldValue.delete() });
             revalidatePath('/system/deleted-log');
             return { success: true };
        }

        // Restore main voucher
        writeBatch.update(journalVoucherRef, {
            isDeleted: false,
            deletedAt: FieldValue.delete(),
            deletedBy: FieldValue.delete(),
        });

        // Remove from deleted-vouchers collection
        writeBatch.delete(deletedVoucherRef);

        await writeBatch.commit();
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'VOUCHER',
            description: `استعاد السند المحذوف رقم: ${voucherId}`,
            targetId: voucherId,
        });

        revalidatePath('/system/deleted-log');
        revalidatePath('/accounts/vouchers/list');
        return { success: true };

    } catch (e: any) {
        console.error("Error restoring voucher:", e);
        return { success: false, error: e.message };
    }
}


export async function permanentDeleteVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized." };

    try {
        const batch = db.batch();
        
        // Delete from all possible collections
        batch.delete(db.collection('journal-vouchers').doc(voucherId));
        batch.delete(db.collection('deleted-vouchers').doc(voucherId));
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'VOUCHER',
            description: `حذف السند نهائياً (ID: ${voucherId})`,
            targetId: voucherId,
        });

        revalidatePath('/system/deleted-log');
        revalidatePath('/accounts/vouchers/list');
        return { success: true };
    } catch (e: any) {
        console.error("Error permanently deleting voucher:", e);
        return { success: false, error: "Failed to permanently delete voucher." };
    }
}
