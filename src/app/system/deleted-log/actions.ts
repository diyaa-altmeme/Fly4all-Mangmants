
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

// Helper function to safely serialize document data
const processDeletedDoc = (doc: FirebaseFirestore.DocumentSnapshot): DeletedVoucher | null => {
    const data = doc.data();
    if (!data) return null;

    const safeData: any = { id: doc.id, voucherId: doc.id };

    for (const key in data) {
        const value = data[key];
        if (value && typeof value.toDate === 'function') {
            safeData[key] = value.toDate().toISOString();
        } else {
            safeData[key] = value;
        }
    }
    return safeData as DeletedVoucher;
};


export async function getDeletedVouchers(): Promise<DeletedVoucher[]> {
    const db = await getDb();
    if (!db) return [];
    
    const snapshot = await db.collection('journal-vouchers')
        .where('isDeleted', '==', true)
        .orderBy('deletedAt', 'desc')
        .get();
        
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => processDeletedDoc(doc)).filter(Boolean) as DeletedVoucher[];
}


export async function restoreVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        await db.runTransaction(async (transaction) => {
            const voucherRef = db.collection('journal-vouchers').doc(voucherId);
            const voucherDoc = await transaction.get(voucherRef);
            if (!voucherDoc.exists) {
                // If it doesn't exist in the main collection, maybe it was fully deleted from there
                // and only exists in deleted-vouchers. Let's try to restore from there.
                const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);
                const deletedVoucherDoc = await transaction.get(deletedVoucherRef);
                if (deletedVoucherDoc.exists) {
                    const dataToRestore = deletedVoucherDoc.data();
                    delete (dataToRestore as any).deletedAt;
                    delete (dataToRestore as any).deletedBy;
                    transaction.set(voucherRef, { ...dataToRestore, isDeleted: false });
                    transaction.delete(deletedVoucherRef);
                } else {
                    throw new Error('Voucher not found in main or deleted collections.');
                }
            } else {
                // Restore main voucher
                transaction.update(voucherRef, { 
                    isDeleted: false, 
                    deletedAt: FieldValue.delete(), 
                    deletedBy: FieldValue.delete() 
                });
            }

            // Restore original source document if it exists
            const voucherData = voucherDoc.data();
            const sourceId = voucherData?.sourceId;
            const sourceType = voucherData?.sourceType;

            if (sourceId && sourceType) {
                const sourceRef = db.collection(`${sourceType}s`).doc(sourceId);
                transaction.update(sourceRef, { 
                    isDeleted: false,
                    deletedAt: FieldValue.delete(),
                    deletedBy: FieldValue.delete(),
                });
            }
        });
        
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
        await db.runTransaction(async (transaction) => {
            const voucherRef = db.collection('journal-vouchers').doc(voucherId);
            const voucherDoc = await transaction.get(voucherRef);
            
            if (voucherDoc.exists) {
                const voucherData = voucherDoc.data();
                const sourceId = voucherData?.sourceId;
                const sourceType = voucherData?.sourceType;

                if (sourceId && sourceType) {
                     const sourceRef = db.collection(`${sourceType}s`).doc(sourceId);
                     transaction.delete(sourceRef);
                }
                 transaction.delete(voucherRef);
            }
            
            // Also delete from the deleted-vouchers log
            const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);
            transaction.delete(deletedVoucherRef);
        });

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
