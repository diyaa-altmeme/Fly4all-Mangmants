
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


export async function getSegments(includeDeleted = false): Promise<SegmentEntry[]> {
    try {
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

export async function addSegmentEntries(entries: Omit<SegmentEntry, 'id'>[]): Promise<{ success: boolean; error?: string, newEntries?: SegmentEntry[] }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user) || !user.boxId) {
         return { success: false, error: "User not authenticated or box not assigned." };
    }

    const newEntries: SegmentEntry[] = [];
    
    try {
        const entryDate = new Date(); // Use a single timestamp for the entire batch

        for (const entryData of entries) {
            const batch = db.batch();
            const segmentDocRef = db.collection('segments').doc();
            const segmentInvoiceNumber = await getNextVoucherNumber('SEG');
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                invoiceNumber: segmentInvoiceNumber,
                enteredBy: user.name, // The user performing the action
                createdAt: entryDate.toISOString(),
                isDeleted: false,
            };
            batch.set(segmentDocRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: segmentDocRef.id });

            await postJournalEntry({
                sourceType: "segment",
                sourceId: segmentDocRef.id,
                description: `إيراد سكمنت من ${entryData.companyName} للفترة من ${entryData.fromDate} إلى ${entryData.toDate}`,
                amount: entryData.total,
                currency: entryData.currency,
                date: entryDate,
                userId: user.uid,
            });

            // Increment use count for the client
            batch.update(db.collection('clients').doc(entryData.clientId), { 
                'segmentSettings.ticketProfitType': entryData.ticketProfitType,
                'segmentSettings.ticketProfitValue': entryData.ticketProfitValue,
                'segmentSettings.visaProfitType': entryData.visaProfitType,
                'segmentSettings.visaProfitValue': entryData.visaProfitValue,
                'segmentSettings.hotelProfitType': entryData.hotelProfitType,
                'segmentSettings.hotelProfitValue': entryData.hotelProfitValue,
                'segmentSettings.groupProfitType': entryData.groupProfitType,
                'segmentSettings.groupProfitValue': entryData.groupProfitValue,
                'segmentSettings.alrawdatainSharePercentage': entryData.alrawdatainSharePercentage,
                'useCount': FieldValue.increment(1)
            });
             await batch.commit();
        }

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
        await db.collection('segments').doc(id).update(data);
        revalidatePath('/segments');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating segment entry: ", String(error));
        return { success: false, error: "Failed to update segment entry." };
    }
}

export async function deleteSegmentPeriod(fromDate: string, toDate: string, permanent: boolean = false): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        const snapshot = await db.collection('segments')
            .where('fromDate', '==', fromDate)
            .where('toDate', '==', toDate)
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
        
        // Also soft/hard delete the corresponding journal vouchers
        if (invoiceNumbers.size > 0) {
            for (const invoiceNumber of Array.from(invoiceNumbers)) {
                const voucherSnapshot = await db.collection('journal-vouchers')
                    .where('invoiceNumber', '==', invoiceNumber)
                    .where('voucherType', '==', 'segment')
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
        return { success: false, error: "Failed to delete segment period.", count: 0 };
    }
}

export async function restoreSegmentPeriod(fromDate: string, toDate: string): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        const snapshot = await db.collection('segments')
            .where('fromDate', '==', fromDate)
            .where('toDate', '==', toDate)
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
                    .where('voucherType', '==', 'segment')
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
        return { success: false, error: "Failed to restore segment period.", count: 0 };
    }
}
