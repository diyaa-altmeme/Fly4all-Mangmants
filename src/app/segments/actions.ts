
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, JournalEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';
import { FieldValue } from 'firebase-admin/firestore';


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
    if (!user || !('role' in user)) return { success: false, error: "User not authenticated or not an employee." };

    const writeBatch = db.batch();
    const newEntries: SegmentEntry[] = [];
    
    try {
        const entryDate = new Date(); // Use a single timestamp for the entire batch
        const invoiceNumber = await getNextVoucherNumber('SEG');

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                invoiceNumber,
                enteredBy: user.name,
                createdAt: entryDate.toISOString(),
                isDeleted: false,
            };
            writeBatch.set(segmentDocRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: segmentDocRef.id });

            // Create a dedicated Journal Entry for this specific segment entry
            const journalVoucherRef = db.collection('journal-vouchers').doc();
            
            // Generate detailed descriptions
            const periodText = `للفترة من ${entryData.fromDate} إلى ${entryData.toDate}`;
            const detailsText = `${entryData.tickets} تذكرة، ${entryData.visas} فيزا، ${entryData.hotels} فندق، ${entryData.groups} جروبات`;
            
            const clientDescription = `السكمنت عن الفترة (${entryData.fromDate} – ${entryData.toDate}) – تفاصيل: ${detailsText}. تم الحساب حسب النسبة.`;
            const partnerDescription = `حصة الشريك من أرباح سكمنت شركة ${entryData.companyName} ${periodText} عن ${detailsText}.`;
            const alrawdatainDescription = `حصة الروضتين من سكمنت شركة ${entryData.companyName} ${periodText}.`;

            // Debit the client for the total profit (this is what they owe)
            const debitEntries: JournalEntry[] = [
                { accountId: entryData.clientId, amount: entryData.total, description: clientDescription },
            ];

            // Credit the partner for their share (liability for us)
            // Credit our revenue account for our share (income for us)
            const creditEntries: JournalEntry[] = [
                { accountId: entryData.partnerId, amount: entryData.partnerShare, description: partnerDescription },
                { accountId: 'revenue_segments', amount: entryData.alrawdatainShare, description: alrawdatainDescription },
            ];
            
            // This check should theoretically always pass if calculations are correct
            const totalDebit = debitEntries.reduce((sum, e) => sum + e.amount, 0);
            const totalCredit = creditEntries.reduce((sum, e) => sum + e.amount, 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                console.error(`Journal entry for segment of ${entryData.companyName} is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
                // Skip this entry to avoid creating an unbalanced journal voucher
                continue; 
            }

             writeBatch.set(journalVoucherRef, {
                invoiceNumber: invoiceNumber,
                date: entryDate.toISOString(), // Use the entry date for the accounting record
                currency: entryData.currency,
                exchangeRate: null,
                notes: `قيد أرباح السكمنت لشركة ${entryData.companyName} عن الفترة من ${entryData.fromDate} إلى ${entryData.toDate}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: entryDate.toISOString(),
                updatedAt: entryDate.toISOString(),
                voucherType: "segment",
                debitEntries,
                creditEntries,
                isAudited: true, // Auto-audited
                isConfirmed: true, // Auto-confirmed
                isDeleted: false,
                originalData: { ...dataWithUser, segmentId: segmentDocRef.id }, 
            });

            // Update client settings and use counts
            if (entryData.clientId) {
                const clientRef = db.collection('clients').doc(entryData.clientId);
                writeBatch.update(clientRef, { 
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
            }
             if (entryData.partnerId) {
                 const partnerRef = db.collection('clients').doc(entryData.partnerId);
                 writeBatch.update(partnerRef, { 'useCount': FieldValue.increment(1) });
             }
        }

        await writeBatch.commit();

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
        revalidatePath('/segments/deleted-segments');
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
        revalidatePath('/segments/deleted-segments');
        revalidatePath('/reports/account-statement');
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error("Error restoring segment period: ", String(error));
        return { success: false, error: "Failed to restore segment period.", count: 0 };
    }
}
