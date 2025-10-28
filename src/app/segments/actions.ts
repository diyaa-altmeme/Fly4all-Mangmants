

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, JournalEntry, Client } from '@/lib/types';
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
        const db = await getDb();
        if (!db) return [];
        
        let query = db.collection('segments').orderBy('toDate', 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const allSegments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));

        return allSegments.filter(s => !!s.isDeleted === includeDeleted);

    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        // Do not throw permission errors, just return empty array. The UI will handle it.
        if (error instanceof Error && error.message.startsWith('Access Denied')) {
             return [];
        }
        return [];
    }
}

function calculateShares(data: any, clientSettings?: SegmentSettings) {
    const settings = clientSettings || {
        ticketProfitType: 'percentage', ticketProfitValue: 50,
        visaProfitType: 'percentage', visaProfitValue: 100,
        hotelProfitType: 'percentage', hotelProfitValue: 100,
        groupProfitType: 'percentage', groupProfitValue: 100,
        alrawdatainSharePercentage: 50,
    };

    const computeService = (count: number, type: 'fixed' | 'percentage', value: number) => {
      if (!count || !value) return 0;
      return type === 'fixed' ? count * value : (count * value) / 100;
    };
    
    const ticketProfits = computeService(data.tickets, settings.ticketProfitType, settings.ticketProfitValue);
    const visaProfits = computeService(data.visas, settings.visaProfitType, settings.visaProfitValue);
    const hotelProfits = computeService(data.hotels, settings.hotelProfitType, settings.hotelProfitValue);
    const groupProfits = computeService(data.groups, settings.groupProfitType, settings.groupProfitValue);
    
    const otherProfits = visaProfits + hotelProfits + groupProfits;
    const total = ticketProfits + otherProfits;
    
    const alrawdatainShare = data.hasPartner ? total * (data.alrawdatainSharePercentage / 100) : total;
    const partnerShare = data.hasPartner ? total - alrawdatainShare : 0;
    
    return { ticketProfits, otherProfits, total, alrawdatainShare, partnerShare };
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
            const entryDate = entryData.entryDate ? new Date(entryData.entryDate) : new Date();

            // Fetch Client and Partner details for accuracy
            const [clientDoc, partnerDoc] = await Promise.all([
                db.collection('clients').doc(entryData.clientId).get(),
                entryData.partnerId ? db.collection('clients').doc(entryData.partnerId).get() : Promise.resolve(null),
            ]);

            if (!clientDoc.exists) throw new Error(`Client with ID ${entryData.clientId} not found.`);
            
            const client = clientDoc.data() as Client;
            const partner = partnerDoc && partnerDoc.exists ? partnerDoc.data() as Client : null;

            // Recalculate shares on the server to ensure integrity
            const calculatedShares = calculateShares(entryData, client.segmentSettings);

            const dataToSave: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                ...calculatedShares, // Use server-calculated shares
                companyName: client.name,
                partnerId: entryData.hasPartner && partner ? partner.id : '',
                partnerName: entryData.hasPartner && partner ? partner.name : '',
                periodId: periodId,
                invoiceNumber: segmentInvoiceNumber, 
                enteredBy: user.name,
                createdAt: new Date().toISOString(),
                isDeleted: false,
            };

            mainBatch.set(segmentDocRef, dataToSave);
            
             const creditEntries: JournalEntry[] = [];

            if (dataToSave.hasPartner && dataToSave.partnerId && dataToSave.partnerShare > 0) {
                 creditEntries.push({
                    accountId: dataToSave.partnerId,
                    amount: dataToSave.partnerShare,
                    description: `حصة الشريك ${dataToSave.partnerName}`
                });
            }

            if (dataToSave.alrawdatainShare > 0) {
                 const revenueAccountId = 'revenue_segments';
                 if(!revenueAccountId) throw new Error("Revenue account for segments is not defined.");
                 creditEntries.push({
                    accountId: revenueAccountId,
                    amount: dataToSave.alrawdatainShare,
                    description: 'حصة الشركة من السكمنت'
                });
            }

             await postJournalEntry({
                sourceType: 'segment',
                sourceId: segmentDocRef.id,
                description: `ربح سكمنت من ${dataToSave.companyName} للفترة من ${dataToSave.fromDate} إلى ${dataToSave.toDate}`,
                amount: dataToSave.total,
                currency: dataToSave.currency,
                date: entryDate,
                userId: user.uid,
                debitAccountId: dataToSave.clientId,
                creditEntries: creditEntries,
            });
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
        const segmentIds = snapshot.docs.map(doc => doc.id);

        snapshot.docs.forEach(doc => {
            if (permanent) {
                 batch.delete(doc.ref);
            } else {
                 batch.update(doc.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
            }
        });
        
        if (segmentIds.length > 0) {
            // Firestore 'in' queries are limited to 30 items
            for (let i = 0; i < segmentIds.length; i += 30) {
                const chunk = segmentIds.slice(i, i + 30);
                const voucherSnapshot = await db.collection('journal-vouchers').where('sourceId', 'in', chunk).get();
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
        const segmentIds = snapshot.docs.map(doc => doc.id);

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
        });

        if (segmentIds.length > 0) {
             for (let i = 0; i < segmentIds.length; i += 30) {
                const chunk = segmentIds.slice(i, i + 30);
                const voucherSnapshot = await db.collection('journal-vouchers').where('sourceId', 'in', chunk).get();
                voucherSnapshot.forEach(doc => {
                    batch.update(doc.ref, { isDeleted: false, deletedAt: FieldValue.delete() });
                });
            }
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

// Dummy functions to satisfy type requirements in other files temporarily
export async function updateSegmentEntry(entryId: string, data: any) { return { success: false, error: 'Not implemented' }; }
