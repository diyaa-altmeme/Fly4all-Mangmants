

'use server';

import { getDb } from '@/lib/firebase-admin';
import { postJournalEntry } from '@/lib/finance/postJournal';
import type { SegmentEntry, SegmentSettings, JournalEntry, Client, Supplier } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';
import { FieldValue } from 'firebase-admin/firestore';

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

function calculateShares(data: any, companySettings?: Partial<SegmentSettings>) {
    const settings = companySettings || {};
    
    const computeService = (count: number, type: 'fixed' | 'percentage', value: number) => {
      if (!count || !value) return 0;
      return type === 'fixed' ? count * value : count * (value / 100);
    };
    
    const ticketProfits = computeService(data.tickets, data.ticketProfitType || 'percentage', data.ticketProfitValue || 50);
    const visaProfits = computeService(data.visas, data.visaProfitType || 'percentage', data.visaProfitValue || 100);
    const hotelProfits = computeService(data.hotels, data.hotelProfitType || 'percentage', data.hotelProfitValue || 100);
    const groupProfits = computeService(data.groups, data.groupProfitType || 'percentage', data.groupProfitValue || 100);
    
    const otherProfits = visaProfits + hotelProfits + groupProfits;
    const total = ticketProfits + otherProfits;
    
    const alrawdatainSharePercentage = data.hasPartner ? data.alrawdatainSharePercentage : 100;
    const alrawdatainShare = total * (alrawdatainSharePercentage / 100);
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
        const periodId = periodIdToReplace || db.collection('temp').doc().id;
        
        // If editing, delete old data first
        if (periodIdToReplace) {
           await deleteSegmentPeriod(periodIdToReplace);
        }

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            const segmentInvoiceNumber = entryData.invoiceNumber || await getNextVoucherNumber('SEG');
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
            
            const { supplierId, ...dataWithoutSupplier } = dataToSave as any;
            if(supplierId) {
                (dataWithoutSupplier as any).supplierId = supplierId;
            }

            await segmentDocRef.set(dataWithoutSupplier);
            
            const revenueAccountId = 'revenue_segments';
            if(!revenueAccountId) throw new Error("Revenue account for segments is not defined.");

            const journalEntries: JournalEntry[] = [];

            journalEntries.push({
                accountId: dataToSave.clientId,
                debit: dataToSave.total,
                credit: 0,
                currency: dataToSave.currency,
                description: `استحقاق أرباح سكمنت للفترة ${dataToSave.fromDate} - ${dataToSave.toDate}`,
                relationId: dataToSave.clientId,
            });


            const partnerShares = (dataToSave.partnerShares && dataToSave.partnerShares.length > 0)
                ? dataToSave.partnerShares
                : (dataToSave.hasPartner && dataToSave.partnerId ? [{ partnerId: dataToSave.partnerId, partnerName: dataToSave.partnerName, share: dataToSave.partnerShare, partnerInvoiceNumber: await getNextVoucherNumber("PARTNER") }] : []);

            for (const share of partnerShares) {
                if (!share || !share.partnerId || !share.share) continue;
                journalEntries.push({
                    accountId: share.partnerId,
                    debit: 0,
                    credit: share.share,
                    currency: dataToSave.currency,
                    description: `حصة الشريك ${share.partnerName || ''}`.trim(),
                    relationId: share.partnerId,
                });
                 await postJournalEntry({
                    invoiceNumber: share.partnerInvoiceNumber,
                    sourceType: 'segment',
                    sourceId: segmentDocRef.id,
                    description: `دفع حصة الشريك ${share.partnerName} عن سكمنت ${dataToSave.companyName}`,
                    date: entryDate,
                    userId: user.uid,
                    entries: [
                        { accountId: share.partnerId, debit: share.share, credit: 0, currency: dataToSave.currency, relationId: share.partnerId },
                        { accountId: user.boxId!, debit: 0, credit: share.share, currency: dataToSave.currency }
                    ],
                    meta: { ...dataToSave, periodId, partnerId: share.partnerId, partnerInvoiceNumber: share.partnerInvoiceNumber },
                });
            }

            if (dataToSave.alrawdatainShare > 0) {
                journalEntries.push({
                    accountId: revenueAccountId,
                    debit: 0,
                    credit: dataToSave.alrawdatainShare,
                    currency: dataToSave.currency,
                    description: 'حصة الشركة من السكمنت',
                });
            }

            const meta = {
              ...dataToSave,
              periodId,
              partnerIds: partnerShares.map(p => p.partnerId).filter(Boolean),
            };

            if (supplierId) {
              (meta as any).supplierId = supplierId;
            }

            await postJournalEntry({
                invoiceNumber: segmentInvoiceNumber,
                sourceType: 'segment',
                sourceId: segmentDocRef.id,
                description: `ربح سكمنت من ${dataToSave.companyName} للفترة من ${dataToSave.fromDate} إلى ${dataToSave.toDate}`,
                date: entryDate,
                userId: user.uid,
                entries: journalEntries,
                meta,
            });
        }

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
        const user = await checkSegmentPermission();
        const now = new Date().toISOString();
        const deletedBy = user.name || user.uid;

        const segmentsQuery = db.collection('segments').where('periodId', '==', periodId);
        const segmentsSnap = await segmentsQuery.get();
        if (segmentsSnap.empty) {
            console.log(`No segments found for periodId: ${periodId}. Nothing to delete.`);
            return { success: true, count: 0 };
        }
        const segmentIds = segmentsSnap.docs.map(doc => doc.id);

        await db.runTransaction(async (transaction) => {
            // STEP 1: READ all necessary documents first.
            const voucherPromises = [];
            for (let i = 0; i < segmentIds.length; i += 30) {
                const chunk = segmentIds.slice(i, i + 30);
                const voucherQuery = db.collection('journal-vouchers').where('sourceId', 'in', chunk);
                voucherPromises.push(transaction.get(voucherQuery));
            }
            const voucherSnapshots = await Promise.all(voucherPromises);

            const deletedVoucherRefs = voucherSnapshots.flatMap(snap => snap.docs).map(doc => db.collection('deleted-vouchers').doc(doc.id));
            // Read documents from deleted-vouchers if they exist (although they shouldn't in a non-permanent delete)
            if (permanent) {
                for (const ref of deletedVoucherRefs) {
                    await transaction.get(ref);
                }
            }


            // STEP 2: WRITE all changes after all reads are complete.
            segmentsSnap.docs.forEach(doc => {
                if (permanent) {
                    transaction.delete(doc.ref);
                } else {
                    transaction.update(doc.ref, { isDeleted: true, deletedAt: now, deletedBy });
                }
            });

            for (const voucherSnapshot of voucherSnapshots) {
                for (const doc of voucherSnapshot.docs) {
                    if (permanent) {
                        transaction.delete(doc.ref);
                    } else {
                        transaction.update(doc.ref, { 
                            isDeleted: true,
                            deletedAt: now, 
                            deletedBy: deletedBy 
                        });
                        const deletedVoucherRef = db.collection('deleted-vouchers').doc(doc.id);
                        transaction.set(deletedVoucherRef, {
                            ...doc.data(),
                            deletedAt: now,
                            deletedBy: deletedBy
                        });
                    }
                }
            }
        });

        revalidatePath('/segments');
        revalidatePath('/system/deleted-log');
        return { success: true, count: segmentIds.length };
    } catch (error: any) {
        console.error("Error deleting segment period: ", String(error));
        return { success: false, error: error.message || "Failed to delete segment period.", count: 0 };
    }
}


export async function restoreSegmentPeriod(periodId: string): Promise<{ success: boolean; error?: string; count: number; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available.", count: 0 };
    try {
        const user = await checkSegmentPermission();
        const restoredBy = user.name || user.uid;
        const restoredAt = new Date().toISOString();
        
        await db.runTransaction(async (transaction) => {
            // STEP 1: READ
            const segmentsQuery = db.collection('segments')
                .where('periodId', '==', periodId)
                .where('isDeleted', '==', true);
            const segmentsSnap = await transaction.get(segmentsQuery);
            if (segmentsSnap.empty) return;

            const segmentIds = segmentsSnap.docs.map(doc => doc.id);
            const voucherPromises = [];
             for (let i = 0; i < segmentIds.length; i += 30) {
                const chunk = segmentIds.slice(i, i + 30);
                const voucherQuery = db.collection('journal-vouchers').where('sourceId', 'in', chunk);
                voucherPromises.push(transaction.get(voucherQuery));
            }
            const voucherSnapshots = await Promise.all(voucherPromises);
            
            // THEN WRITE
            segmentsSnap.docs.forEach(doc => {
                transaction.update(doc.ref, {
                    isDeleted: false,
                    deletedAt: FieldValue.delete(),
                    deletedBy: FieldValue.delete(),
                    restoredAt,
                    restoredBy,
                });
            });

            for (const voucherSnapshot of voucherSnapshots) {
                voucherSnapshot.forEach(doc => {
                    transaction.update(doc.ref, { 
                        isDeleted: false,
                        deletedAt: FieldValue.delete(),
                        deletedBy: FieldValue.delete(),
                        restoredAt,
                        restoredBy,
                    });
                     const deletedVoucherRef = db.collection('deleted-vouchers').doc(doc.id);
                     transaction.delete(deletedVoucherRef);
                });
            }
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'SEGMENT',
            description: `استعاد فترة السكمنت المحذوفة (ID: ${periodId})`,
            targetId: periodId,
        });

        revalidatePath('/segments');
        revalidatePath('/system/deleted-log');
        return { success: true, count: 0 }; // Count is not easily available here
    } catch (e: any) {
        return { success: false, error: e.message, count: 0 };
    }
}

// Dummy functions to satisfy type requirements in other files temporarily
export async function updateSegmentEntry(entryId: string, data: any) { return { success: false, error: 'Not implemented' }; }
