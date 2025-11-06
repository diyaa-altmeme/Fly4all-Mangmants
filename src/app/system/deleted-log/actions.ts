
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
    
    const snapshot = await db.collection('journal-vouchers')
        .where('isDeleted', '==', true)
        .orderBy('deletedAt', 'desc')
        .get();
        
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            voucherId: doc.id,
        } as DeletedVoucher;
    });
}


export async function restoreVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const batch = db.batch();
        const voucherRef = db.collection('journal-vouchers').doc(voucherId);
        
        // Restore main voucher
        batch.update(voucherRef, { 
            isDeleted: false, 
            deletedAt: FieldValue.delete(), 
            deletedBy: FieldValue.delete() 
        });
        
        // Restore original source document if it exists
        const voucherDoc = await voucherRef.get();
        const voucherData = voucherDoc.data();
        const sourceId = voucherData?.sourceId;
        const sourceType = voucherData?.sourceType;

        if (sourceId && sourceType) {
            const sourceRef = db.collection(`${sourceType}s`).doc(sourceId);
            batch.update(sourceRef, { 
                isDeleted: false,
                deletedAt: FieldValue.delete(),
                deletedBy: FieldValue.delete(),
            });
        }
        
        await batch.commit();
        
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
        revalidatePath('/accounts/vouchers/log');
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
        
        const voucherRef = db.collection('journal-vouchers').doc(voucherId);
        const voucherDoc = await voucherRef.get();
        if (voucherDoc.exists) {
            const voucherData = voucherDoc.data();
            const sourceId = voucherData?.sourceId;
            const sourceType = voucherData?.sourceType;

            if (sourceId && sourceType) {
                 const sourceRef = db.collection(`${sourceType}s`).doc(sourceId);
                 batch.delete(sourceRef);
            }
        }
        
        batch.delete(voucherRef);
        
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
        revalidatePath('/accounts/vouchers/log');
        return { success: true };
    } catch (e: any) {
        console.error("Error permanently deleting voucher:", e);
        return { success: false, error: "Failed to permanently delete voucher." };
    }
}
