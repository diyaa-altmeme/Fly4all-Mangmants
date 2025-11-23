
'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { getCurrentUserFromSession } from '@/app/(auth)/actions';
import { createAuditLog } from '../activity-log/actions';
import { permanentlyDeleteVoucherRecord, restoreVoucherRecord } from '@/lib/finance/voucher-lifecycle';

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
    
    const snapshot = await db.collection('deleted-vouchers')
        .orderBy('deletedAt', 'desc')
        .get();
        
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => processDeletedDoc(doc)).filter(Boolean) as DeletedVoucher[];
}


export async function restoreVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    const user = await getCurrentUserFromSession();
    if (!user || !('name' in user)) return { success: false, error: 'Unauthorized' };

    try {
        const voucherRef = db.collection('journal-vouchers').doc(voucherId);
        const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);

        const [voucherSnap, deletedVoucherSnap] = await Promise.all([
            voucherRef.get(),
            deletedVoucherRef.get(),
        ]);

        const voucherData = (voucherSnap.exists
            ? voucherSnap.data()
            : deletedVoucherSnap.data()) as JournalVoucher | undefined;

        if (!voucherData) {
            return { success: false, error: 'Voucher not found in deleted log.' };
        }

        const restoredBy = user.name || user.uid;
        const restoredAt = new Date().toISOString();

        await restoreVoucherRecord({
            db,
            voucherId,
            restoredBy,
            restoredAt,
        });

        if (voucherData.sourceType && voucherData.sourceId) {
            const sourceRef = db.collection(`${voucherData.sourceType}s`).doc(voucherData.sourceId);
            await sourceRef.set({
                isDeleted: false,
                deletedAt: FieldValue.delete(),
                deletedBy: FieldValue.delete(),
                restoredAt,
                restoredBy,
            }, { merge: true });
        }

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
    if (!user || !('name' in user)) return { success: false, error: "Unauthorized." };

    try {
        const voucherRef = db.collection('journal-vouchers').doc(voucherId);
        const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);

        const [voucherSnap, deletedVoucherSnap] = await Promise.all([
            voucherRef.get(),
            deletedVoucherRef.get(),
        ]);

        const voucherData = (voucherSnap.exists
            ? voucherSnap.data()
            : deletedVoucherSnap.data()) as JournalVoucher | undefined;

        if (!voucherData) {
            return { success: false, error: 'Voucher not found.' };
        }

        if (voucherData.sourceType && voucherData.sourceId) {
            const sourceRef = db.collection(`${voucherData.sourceType}s`).doc(voucherData.sourceId);
            await sourceRef.delete().catch(() => undefined);
        }

        await permanentlyDeleteVoucherRecord({ db, voucherId });

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
