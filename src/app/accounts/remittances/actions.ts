
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Remittance, ReceiptVoucher, JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { format, parseISO } from 'date-fns';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { getSettings } from '@/app/settings/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '@/app/system/activity-log/actions';

const safeToISOString = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toISOString();
    }
    if (typeof dateValue === 'string') {
        return dateValue;
    }
    return new Date(dateValue).toISOString();
};

const processRemittanceData = (doc: FirebaseFirestore.DocumentSnapshot): Remittance => {
    const data = doc.data() as any;
    // Ensure all potential date fields are consistently strings
    const safeData = {
        ...data,
        id: doc.id,
        createdAt: safeToISOString(data.createdAt),
        updatedAt: safeToISOString(data.updatedAt),
        auditedAt: safeToISOString(data.auditedAt),
        receivedAt: safeToISOString(data.receivedAt),
    };
    return safeData as Remittance;
};


export const getRemittances = async (): Promise<Remittance[]> => {
    const settings = await getSettings();
    if (!settings.databaseStatus?.isDatabaseConnected) {
        console.log("Database connection is disabled in settings. Skipping getRemittances fetch.");
        return [];
    }
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection('remittances').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(processRemittanceData);

    } catch (error) {
        console.error("Error getting remittances from Firestore: ", String(error));
        return [];
    }
};


export async function addRemittance(remittanceData: Omit<Remittance, 'id' | 'createdAt' | 'createdBy' | 'status' | 'isAudited' | 'updatedAt'>): Promise<{ success: boolean; error?: string; newRemittance?: Remittance }> {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }
    
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const docRef = db.collection('remittances').doc();
        const dataToSave: Omit<Remittance, 'id'> = {
            ...remittanceData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.name,
            status: 'pending_audit',
            isAudited: false,
        };
        await docRef.set(dataToSave);
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'VOUCHER',
            description: `أضاف حوالة جديدة من ${remittanceData.companyName} بمبلغ ${remittanceData.totalAmountUsd > 0 ? `${remittanceData.totalAmountUsd} USD` : `${remittanceData.totalAmountIqd} IQD`}.`,
        });

        revalidatePath('/accounts/remittances');

        const newRemittance = { id: docRef.id, ...dataToSave };
        return { success: true, newRemittance };

    } catch (error) {
        console.error("Error adding remittance: ", String(error));
        return { success: false, error: "Failed to add remittance." };
    }
}


export async function auditRemittance(remittanceId: string, auditNotes: string) {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const remittanceRef = db.collection('remittances').doc(remittanceId);
        await remittanceRef.update({
            status: 'pending_reception',
            isAudited: true,
            auditedBy: user.name,
            auditedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            auditNotes: auditNotes,
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'APPROVE',
            targetType: 'VOUCHER',
            description: `دقق الحوالة رقم ${remittanceId}.`,
        });

        revalidatePath('/accounts/remittances');
        return { success: true };
    } catch (error) {
        console.error("Error auditing remittance: ", String(error));
        return { success: false, error: "Failed to audit remittance." };
    }
}

export async function receiveRemittance(remittance: Remittance, boxId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }
    
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const batch = db.batch();
    
    // 1. Update remittance status
    const remittanceRef = db.collection('remittances').doc(remittance.id);
    batch.update(remittanceRef, {
        status: 'received',
        receivedBy: user.name,
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // 2. Create a corresponding receipt voucher
    const receiptVoucherRef = db.collection('journal-vouchers').doc();
    const invoiceNumber = await getNextVoucherNumber('TR');
    
    const receiptVoucherData: Omit<JournalVoucher, 'id'> = {
        invoiceNumber: invoiceNumber,
        date: new Date().toISOString(),
        currency: remittance.totalAmountUsd > 0 ? 'USD' : 'IQD',
        exchangeRate: null, // Assume no exchange for now
        notes: `استلام حوالة من مكتب ${remittance.officeName}`,
        createdBy: user.uid,
        officer: user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        voucherType: "journal_from_remittance",
        debitEntries: [{
            accountId: boxId,
            amount: remittance.totalAmountUsd > 0 ? remittance.totalAmountUsd : remittance.totalAmountIqd,
            description: `ايداع حوالة من ${remittance.companyName}`
        }],
        creditEntries: [{
            accountId: `remittance_source_${remittance.officeName.toLowerCase()}`, // Needs mapping to real account
            amount: remittance.totalAmountUsd > 0 ? remittance.totalAmountUsd : remittance.totalAmountIqd,
            description: `من حساب مكتب ${remittance.officeName}`
        }],
        isAudited: true, // Automatically audited
        isConfirmed: true,
        originalData: remittance
    };
    batch.set(receiptVoucherRef, receiptVoucherData);

    try {
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'APPROVE',
            targetType: 'VOUCHER',
            description: `استلم الحوالة رقم ${remittance.id} وأنشأ سندًا مرافقًا.`,
        });

        revalidatePath('/accounts/remittances');
        revalidatePath('/accounts/vouchers/list');
        return { success: true };
    } catch (error) {
        console.error("Error receiving remittance:", String(error));
        return { success: false, error: "Failed to process remittance reception." };
    }
}

export async function updateRemittance(id: string, data: Partial<Remittance>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        await db.collection('remittances').doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'VOUCHER',
            description: `عدل بيانات الحوالة رقم ${id}.`,
        });

        revalidatePath('/accounts/remittances');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
