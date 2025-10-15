
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, JournalEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';

const SEGMENTS_COLLECTION = 'segments';

export async function getSegments(): Promise<SegmentEntry[]> {
    try {
        const db = await getDb();
        if (!db) return [];
        const snapshot = await db.collection(SEGMENTS_COLLECTION).orderBy('toDate', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));
    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        return [];
    }
}

export async function addSegmentEntries(entries: Omit<SegmentEntry, 'id'>[]): Promise<{ success: boolean; error?: string, newEntries?: SegmentEntry[] }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user)) return { success: false, error: "User not authenticated or not an employee." };

    const batch = db.batch();
    const newEntries: SegmentEntry[] = [];
    
    try {
        const invoiceNumber = await getNextVoucherNumber('SEG');

        for (const entryData of entries) {
            const segmentDocRef = db.collection(SEGMENTS_COLLECTION).doc();
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                invoiceNumber,
                enteredBy: user.name,
                createdAt: new Date().toISOString(),
            };
            batch.set(segmentDocRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: segmentDocRef.id });

            // Create Journal Entry for this segment entry
            const journalVoucherRef = db.collection('journal-vouchers').doc();
            
            const debitEntries: JournalEntry[] = [
                // The total profit is a debit on the issuing company's account (they owe us this)
                { accountId: entryData.clientId, amount: entryData.total, description: `أرباح سكمنت للفترة ${entryData.fromDate} - ${entryData.toDate}` },
            ];

            const creditEntries: JournalEntry[] = [
                // The partner's share is a credit to their account (we owe them this)
                { accountId: entryData.partnerId, amount: entryData.partnerShare, description: `حصة من أرباح سكمنت شركة ${entryData.companyName}` },
                // Our share is credited to a revenue account
                { accountId: 'revenue_segments', amount: entryData.alrawdatainShare, description: `حصة الروضتين من سكمنت ${entryData.companyName}` },
            ];
            
            // Validate that the journal entry is balanced
            const totalDebit = debitEntries.reduce((sum, e) => sum + e.amount, 0);
            const totalCredit = creditEntries.reduce((sum, e) => sum + e.amount, 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                console.error(`Journal entry for segment of ${entryData.companyName} is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
                // Decide whether to throw an error or just log it
                continue; // Skip this entry if not balanced
            }

             batch.set(journalVoucherRef, {
                invoiceNumber: invoiceNumber, // Use the same invoice number for traceability
                date: entryData.toDate,
                currency: entryData.currency,
                exchangeRate: null,
                notes: `قيد أرباح السكمنت لشركة ${entryData.companyName} عن الفترة من ${entryData.fromDate} إلى ${entryData.toDate}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                voucherType: "segment",
                debitEntries,
                creditEntries,
                isAudited: true,
                isConfirmed: true,
                originalData: { ...dataWithUser, segmentId: segmentDocRef.id }, 
            });


            // Update client settings if they've changed
            if (entryData.clientId) {
                const clientRef = db.collection('clients').doc(entryData.clientId);
                batch.update(clientRef, { 
                    'segmentSettings.ticketProfitType': entryData.ticketProfitType,
                    'segmentSettings.ticketProfitValue': entryData.ticketProfitValue,
                    'segmentSettings.visaProfitType': entryData.visaProfitType,
                    'segmentSettings.visaProfitValue': entryData.visaProfitValue,
                    'segmentSettings.hotelProfitType': entryData.hotelProfitType,
                    'segmentSettings.hotelProfitValue': entryData.hotelProfitValue,
                    'segmentSettings.groupProfitType': entryData.groupProfitType,
                    'segmentSettings.groupProfitValue': entryData.groupProfitValue,
                    'segmentSettings.alrawdatainSharePercentage': entryData.alrawdatainSharePercentage,
                });
            }
        }

        await batch.commit();

        revalidatePath('/segments');
        revalidatePath('/reports/account-statement');
        return { success: true, newEntries };
    } catch (error: any) {
        console.error("Error adding segment entries: ", String(error));
        return { success: false, error: error.message || "Failed to add segment entries." };
    }
}


export async function updateSegmentEntry(id: string, data: Partial<Omit<SegmentEntry, 'id'>>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).update(data);
        revalidatePath('/segments');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating segment entry: ", String(error));
        return { success: false, error: "Failed to update segment entry." };
    }
}

export async function deleteSegmentEntry(id: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).delete();
        revalidatePath('/segments');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting segment entry: ", String(error));
        return { success: false, error: "Failed to delete segment entry." };
    }
}

export async function deleteSegmentPeriod(fromDate: string, toDate: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const snapshot = await db.collection(SEGMENTS_COLLECTION)
            .where('fromDate', '==', fromDate)
            .where('toDate', '==', toDate)
            .get();
        
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        revalidatePath('/segments');
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error deleting segment period: ", String(error));
        return { success: false, error: "Failed to delete segment period." };
    }
}
