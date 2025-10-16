

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
    if (!user || !('role' in user) || !user.boxId) {
         return { success: false, error: "User not authenticated or box not assigned." };
    }

    const writeBatch = db.batch();
    const newEntries: SegmentEntry[] = [];
    
    try {
        const entryDate = new Date(); // Use a single timestamp for the entire batch

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            const segmentInvoiceNumber = await getNextVoucherNumber('SEG');
            
            const dataWithUser: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                invoiceNumber: segmentInvoiceNumber,
                enteredBy: user.name, // The user performing the action
                createdAt: entryDate.toISOString(),
                isDeleted: false,
            };
            writeBatch.set(segmentDocRef, dataWithUser);

            newEntries.push({ ...dataWithUser, id: segmentDocRef.id });

            // 1. Create a Journal Entry for the TOTAL profit owed by the client
            const totalProfitVoucherRef = db.collection('journal-vouchers').doc();
            const periodText = `للفترة من ${entryData.fromDate} إلى ${entryData.toDate}`;
            const detailsText = `${entryData.tickets} تذكرة، ${entryData.visas} فيزا، ${entryData.hotels} فندق، ${entryData.groups} جروبات`;
            const clientDescription = `قيد استحقاق أرباح السكمنت ${periodText}. تفاصيل: ${detailsText}.`;
            
            writeBatch.set(totalProfitVoucherRef, {
                 invoiceNumber: segmentInvoiceNumber,
                 date: entryDate.toISOString(),
                 currency: entryData.currency,
                 notes: clientDescription,
                 createdBy: user.uid,
                 officer: user.name,
                 createdAt: entryDate.toISOString(),
                 updatedAt: entryDate.toISOString(),
                 voucherType: "segment",
                 debitEntries: [{ accountId: entryData.clientId, amount: entryData.total, description: `استحقاق أرباح سكمنت ${entryData.companyName}` }],
                 creditEntries: [{ accountId: 'revenue_segments', amount: entryData.total, description: `إثبات إيراد سكمنت من ${entryData.companyName}` }],
                 isAudited: true, isConfirmed: true,
                 originalData: { ...dataWithUser, segmentId: segmentDocRef.id, entryType: 'total_profit' }, 
            });


            // 2. Create Journal Entries for paying out partner shares
            if (entryData.partnerShares && entryData.partnerShares.length > 0) {
                 for (const share of entryData.partnerShares) {
                    const partnerPaymentInvoice = await getNextVoucherNumber('PV');
                    const partnerPaymentRef = db.collection('journal-vouchers').doc();
                    writeBatch.set(partnerPaymentRef, {
                        invoiceNumber: partnerPaymentInvoice,
                        date: entryDate.toISOString(),
                        currency: entryData.currency,
                        notes: `دفع حصة الشريك ${share.partnerName} عن أرباح سكمنت شركة ${entryData.companyName} ${periodText}`,
                        createdBy: user.uid,
                        officer: user.name,
                        createdAt: entryDate.toISOString(),
                        updatedAt: entryDate.toISOString(),
                        voucherType: "journal_from_payment",
                        debitEntries: [{ accountId: share.partnerId, amount: share.share, description: `إيداع حصة أرباح سكمنت` }],
                        creditEntries: [{ accountId: user.boxId, amount: share.share, description: `دفع حصة أرباح للشريك ${share.partnerName}` }],
                        isAudited: true, isConfirmed: true,
                        originalData: { ...dataWithUser, segmentId: segmentDocRef.id, partnerId: share.partnerId, entryType: 'partner_payout' }
                    });
                     // Increment use count for the partner
                    writeBatch.update(db.collection('clients').doc(share.partnerId), { 'useCount': FieldValue.increment(1) });
                }
            }

            // 3. Create a Journal Entry for Al-Rawdatain's share (moving from revenue to box)
            if (entryData.alrawdatainShare > 0) {
                 const companyProfitInvoice = await getNextVoucherNumber('JE');
                 const companyProfitRef = db.collection('journal-vouchers').doc();
                 writeBatch.set(companyProfitRef, {
                    invoiceNumber: companyProfitInvoice,
                    date: entryDate.toISOString(),
                    currency: entryData.currency,
                    notes: `إثبات حصة الشركة من أرباح سكمنت ${entryData.companyName} ${periodText}`,
                    createdBy: user.uid,
                    officer: user.name,
                    createdAt: entryDate.toISOString(),
                    updatedAt: entryDate.toISOString(),
                    voucherType: "journal_voucher",
                    debitEntries: [{ accountId: 'revenue_segments', amount: entryData.alrawdatainShare, description: 'عكس إيراد سكمنت' }],
                    creditEntries: [{ accountId: 'revenue_profit_distribution', amount: entryData.alrawdatainShare, description: 'تسجيل إيراد حصة الشركة' }],
                    isAudited: true, isConfirmed: true,
                    originalData: { ...dataWithUser, segmentId: segmentDocRef.id, entryType: 'company_share' }
                });
            }

            // Increment use count for the client
            writeBatch.update(db.collection('clients').doc(entryData.clientId), { 
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
