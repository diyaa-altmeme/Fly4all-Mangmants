
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
import { getUserPermissions } from '@/lib/permissions';

// Helper to check for segment access permissions
const checkSegmentPermission = async () => {
  const user = await getCurrentUserFromSession();
  if (!user || !user.id || !('role' in user) || !user.boxId) {
    throw new Error("User not authenticated or box not assigned.");
  }

  const permissions = await getUserPermissions(user.id);
  if (!permissions.some(p => p.name === 'segment_access')) {
    throw new Error("Access Denied: You don't have permission to manage segments.");
  }
  return user;
};

export async function getSegments(includeDeleted = false): Promise<SegmentEntry[]> {
    try {
        await checkSegmentPermission();
        const db = await getDb();
        if (!db) return [];
        
        let query = db.collection('segments').orderBy('toDate', 'desc');
        
        const snapshot = await query.get();

        if (snapshot.empty) return [];
        
        const allSegments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));

        if (includeDeleted) {
            return allSegments.filter(s => s.isDeleted);
        }
        
        return allSegments.filter(s => !s.isDeleted);

    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        return [];
    }
}

export async function addSegmentEntries(entries: Omit<SegmentEntry, 'id'>[], periodIdToReplace?: string): Promise<{ success: boolean; error?: string, newEntries?: SegmentEntry[] }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const user = await checkSegmentPermission();
        const newEntries: SegmentEntry[] = [];
        const mainBatch = db.batch();

        const entryDate = new Date();
        const periodId = periodIdToReplace || db.collection('temp').doc().id; // Generate a unique ID for this batch/period

        // If we are editing, we first need to delete old entries associated with this period
        if (periodIdToReplace) {
            const oldSegmentsSnap = await db.collection('segments').where('periodId', '==', periodIdToReplace).get();
            const oldVoucherPromises: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
            
            oldSegmentsSnap.forEach(doc => {
                const oldInvoice = doc.data().invoiceNumber;
                if(oldInvoice) {
                   oldVoucherPromises.push(db.collection('journal-vouchers').where('invoiceNumber', '==', oldInvoice).get());
                }
                mainBatch.delete(doc.ref);
            });

            const oldVoucherSnaps = await Promise.all(oldVoucherPromises);
            oldVoucherSnaps.forEach(snap => {
                snap.forEach(doc => mainBatch.delete(doc.ref));
            });
        }

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            const segmentInvoiceNumber = await getNextVoucherNumber('SEG');
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                periodId: periodId, // Link all entries to the same period
                invoiceNumber: segmentInvoiceNumber,
                enteredBy: user.name,
                createdAt: entryDate.toISOString(),
                isDeleted: false,
            };
            mainBatch.set(segmentDocRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: segmentDocRef.id });

            // Post journal entry for the segment profit
            await postJournalEntry({
                sourceType: "segment",
                sourceId: segmentDocRef.id,
                description: `إيراد سكمنت من ${entryData.companyName} للفترة من ${entryData.fromDate} إلى ${entryData.toDate}`,
                amount: entryData.total,
                currency: entryData.currency,
                date: entryDate,
                userId: user.uid,
                clientId: entryData.clientId,
            });

            // If there are partner shares, create payment vouchers
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

            // Update client's use count and segment settings
            mainBatch.set(db.collection('clients').doc(entryData.clientId), { 
                segmentSettings: {
                    ticketProfitType: entryData.ticketProfitType,
                    ticketProfitValue: entryData.ticketProfitValue,
                    visaProfitType: entryData.visaProfitType,
                    visaProfitValue: entryData.visaProfitValue,
                    hotelProfitType: entryData.hotelProfitType,
                    hotelProfitValue: entryData.hotelProfitValue,
                    groupProfitType: entryData.groupProfitType,
                    groupProfitValue: entryData.groupProfitValue,
                    alrawdatainSharePercentage: entryData.alrawdatainSharePercentage,
                },
                useCount: FieldValue.increment(1)
            }, { merge: true });
        }

        await mainBatch.commit();

        revalidatePath('/segments');
        revalidatePath('/reports/account-statement');
        return { success: true, newEntries };
    } catch (error: any) {
        console.error("Error adding segment entries: ", String(error));
        return { success: false, error: `Failed to add segment entries: ${error.message}` };
    }
}


export async function updateSegmentEntry(id: string, data: Partial<Omit<SegmentEntry, 'id'>>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await checkSegmentPermission();
        await db.collection('segments').doc(id).update(data);
        revalidatePath('/segments');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating segment entry: ", String(error));
        return { success: false, error: error.message || "Failed to update segment entry." };
    }
}

export async function deleteSegmentPeriod(periodId: string, permanent: boolean = false): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        await checkSegmentPermission();
        const snapshot = await db.collection('segments')
            .where('periodId', '==', periodId)
            .get();
        
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = db.batch();
        const invoiceNumbers = new Set(snapshot.docs.map(doc => doc.data().invoiceNumber));

        snapshot.docs.forEach(doc => {
            if (permanent) {
                 batch.delete(doc.ref);
            } else {
                 batch.update(doc.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
            }
        });
        
        if (invoiceNumbers.size > 0) {
            for (const invoiceNumber of Array.from(invoiceNumbers)) {
                const voucherSnapshot = await db.collection('journal-vouchers')
                    .where('invoiceNumber', '==', invoiceNumber)
                    .get();
                
                voucherSnapshot.forEach(doc => {
                     if (permanent) {
                        batch.delete(doc.ref);
                    } else {
                        batch.update(doc.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
                    }
                });
            }
        }

        await batch.commit();
        
        revalidatePath('/segments');
        revalidatePath('segments/deleted-segments');
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
        
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = db.batch();
        const invoiceNumbers = new Set(snapshot.docs.map(doc => doc.data().invoiceNumber));

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
        });

        if (invoiceNumbers.size > 0) {
             for (const invoiceNumber of Array.from(invoiceNumbers)) {
                 const voucherSnapshot = await db.collection('journal-vouchers')
                    .where('invoiceNumber', '==', invoiceNumber)
                    .get();
                
                voucherSnapshot.forEach(doc => {
                    batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
                });
            }
        }

        await batch.commit();
        
        revalidatePath('/segments');
        revalidatePath('segments/deleted-segments');
        revalidatePath('/reports/account-statement');
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error("Error restoring segment period: ", String(error));
        return { success: false, error: error.message || "Failed to restore segment period.", count: 0 };
    }
}
