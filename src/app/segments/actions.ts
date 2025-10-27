
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, JournalEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';
import { FieldValue } from 'firebase-admin/firestore';
import { postJournalEntry } from '@/lib/finance/postJournal';

// Helper to check for segment access permissions
const checkSegmentPermission = async () => {
  const user = await getCurrentUserFromSession();

  // Ensure it's a user and not a client, and they are authenticated.
  if (!user || 'isClient' in user) {
    throw new Error("Access Denied: User not authenticated or does not have required permissions.");
  }

  // Check for the specific permission directly on the user object.
  // Note: hasPermission helper from client-side can't be used here.
  const hasAccess = user.permissions?.includes('segments:read') || user.role === 'admin';

  if (!hasAccess) {
    throw new Error("Access Denied: You don't have permission to manage segments.");
  }
  
  if (!user.boxId) {
      throw new Error("User has no assigned box. Please contact admin.");
  }

  return user;
};

export async function getSegments(includeDeleted = false): Promise<SegmentEntry[]> {
    try {
        // PERMISSION CHECK REMOVED FROM HERE - It will be handled by ProtectedPage on the client.
        const db = await getDb();
        if (!db) return [];
        
        let query = db.collection('segments').orderBy('toDate', 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const allSegments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));

        return allSegments.filter(s => !!s.isDeleted === includeDeleted);

    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        // We re-throw the specific error from the permission check
        if (error instanceof Error && error.message.startsWith('Access Denied')) {
            throw error;
        }
        // Return empty array for other data-fetching errors
        return [];
    }
}


export async function addSegmentEntries(
    entries: Omit<SegmentEntry, 'id'>[],
    periodIdToReplace?: string
): Promise<{ success: boolean; error?: string; newEntries?: SegmentEntry[] }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const user = await checkSegmentPermission();
        const mainBatch = db.batch();
        const periodId = periodIdToReplace || db.collection('temp').doc().id;

        // If editing, delete old data first
        if (periodIdToReplace) {
            const oldSegmentsSnap = await db.collection('segments').where('periodId', '==', periodIdToReplace).get();
            const oldVouchersSnap = await db.collection('journal-vouchers').where('originalData.periodId', '==', periodIdToReplace).get();
            
            oldSegmentsSnap.forEach(doc => mainBatch.delete(doc.ref));
            oldVouchersSnap.forEach(doc => mainBatch.delete(doc.ref));
        }

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            const segmentInvoiceNumber = await getNextVoucherNumber('SEG');
            const entryDate = new Date();

            const dataToSave: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                periodId: periodId,
                invoiceNumber: segmentInvoiceNumber,
                enteredBy: user.name,
                createdAt: entryDate.toISOString(),
                isDeleted: false,
            };

            mainBatch.set(segmentDocRef, dataToSave);
            
            // 1. Client owes the company the full profit
            await postJournalEntry({
                sourceType: 'segment',
                sourceId: segmentDocRef.id,
                description: `ربح سكمنت من ${entryData.companyName} للفترة من ${entryData.fromDate} إلى ${entryData.toDate}`,
                amount: entryData.total,
                currency: entryData.currency,
                date: entryDate,
                userId: user.uid,
                clientId: entryData.clientId, // The company is the client in this context
            });

            // 2. Pay out partner shares from the company's box
            if (entryData.partnerShares && entryData.partnerShares.length > 0) {
                for (const share of entryData.partnerShares) {
                    await postJournalEntry({
                        sourceType: 'profit-sharing',
                        sourceId: segmentDocRef.id,
                        description: `دفع حصة الشريك ${share.partnerName} من أرباح السكمنت`,
                        amount: share.share,
                        currency: entryData.currency,
                        date: entryDate,
                        userId: user.uid,
                        debitAccountId: share.partnerId,
                        creditAccountId: user.boxId,
                    });
                }
            }
        }

        await mainBatch.commit();
        
        revalidatePath('/segments');
        revalidatePath('/reports/account-statement');
        return { success: true, newEntries: entries as SegmentEntry[] };

    } catch (error: any) {
        console.error("Error adding segment entries: ", String(error));
        return { success: false, error: error.message || `Failed to add segment entries` };
    }
}


export async function deleteSegmentPeriod(periodId: string, permanent: boolean = false): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        await checkSegmentPermission();
        const snapshot = await db.collection('segments').where('periodId', '==', periodId).get();
        if (snapshot.empty) return { success: true, count: 0 };

        const batch = db.batch();
        const invoiceNumbers = new Set(snapshot.docs.map(doc => doc.data().invoiceNumber).filter(Boolean));

        snapshot.docs.forEach(doc => {
            if (permanent) {
                 batch.delete(doc.ref);
            } else {
                 batch.update(doc.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
            }
        });
        
        if (invoiceNumbers.size > 0) {
            const voucherSnapshot = await db.collection('journal-vouchers').where('invoiceNumber', 'in', Array.from(invoiceNumbers)).get();
            voucherSnapshot.forEach(doc => {
                 if (permanent) {
                    batch.delete(doc.ref);
                } else {
                    batch.update(doc.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
                }
            });
        }

        await batch.commit();
        
        revalidatePath('/segments');
        revalidatePath('/segments/deleted-segments');
        revalidatePath('/reports/account-statement');
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error("Error deleting segment period: ", String(error));
        return { success: false, error: error.message || "Failed to delete segment period.", count: 0 };
    }
}

export async function restoreSegmentPeriod(periodId: string): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        await checkSegmentPermission();
        const snapshot = await db.collection('segments')
            .where('periodId', '==', periodId)
            .where('isDeleted', '==', true)
            .get();
        
        if (snapshot.empty) return { success: true, count: 0 };

        const batch = db.batch();
        const invoiceNumbers = new Set(snapshot.docs.map(doc => doc.data().invoiceNumber).filter(Boolean));

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
        });

        if (invoiceNumbers.size > 0) {
            const voucherSnapshot = await db.collection('journal-vouchers').where('invoiceNumber', 'in', Array.from(invoiceNumbers)).get();
            voucherSnapshot.forEach(doc => {
                batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
            });
        }

        await batch.commit();
        
        revalidatePath('/segments');
        revalidatePath('/segments/deleted-segments');
        revalidatePath('/reports/account-statement');
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error("Error restoring segment period: ", String(error));
        return { success: false, error: error.message || "Failed to restore segment period.", count: 0 };
    }
}

    