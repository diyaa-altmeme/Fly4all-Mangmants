'use server';

import { getDb } from '@/lib/firebase-admin';
import { postJournalEntry, recordFinancialTransaction } from '@/lib/finance/posting';
import type { SegmentEntry, SegmentSettings, JournalEntry, Client, Supplier } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';
import { FieldValue } from 'firebase-admin/firestore';
import { getFinanceMap } from '@/lib/finance/posting';


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
    const visasProfits = computeService(data.visas, data.visaProfitType || 'percentage', data.visaProfitValue || 100);
    const hotelProfits = computeService(data.hotels, data.hotelProfitType || 'percentage', data.hotelProfitValue || 100);
    const groupProfits = computeService(data.groups, data.groupProfitType || 'percentage', data.groupProfitValue || 100);
    
    const otherProfits = visasProfits + hotelProfits + groupProfits;
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
        const financeMap = await getFinanceMap();
        
        if (!financeMap.receivableAccountId) throw new Error("حساب الذمم المدينة غير محدد في الإعدادات.");
        if (!financeMap.clearingAccountId) throw new Error("حساب التسوية غير محدد في الإعدادات.");
        if (!financeMap.revenueMap?.segments) throw new Error("حساب إيرادات السكمنت غير محدد.");


        const periodId = periodIdToReplace || db.collection('temp').doc().id;
        const periodInvoiceNumber = await getNextVoucherNumber("SEG");

        if (periodIdToReplace) {
           await deleteSegmentPeriod(periodIdToReplace);
        }

        for (const entryData of entries) {
            const segmentDocRef = db.collection('segments').doc();
            
            const segmentInvoiceNumber = entryData.invoiceNumber;
             if (!segmentInvoiceNumber) {
                const companyNameForError = entryData.companyName || `(ID: ${entryData.clientId})`;
                throw new Error(`رقم الفاتورة مفقود للسجل الخاص بالشركة: ${companyNameForError}.`);
            }

            const entryDate = entryData.entryDate ? new Date(entryData.entryDate) : new Date();

            const [clientDoc, partnerDoc] = await Promise.all([
                db.collection('clients').doc(entryData.clientId).get(),
                entryData.partnerId ? db.collection('clients').doc(entryData.partnerId).get() : Promise.resolve(null),
            ]);

            if (!clientDoc.exists) throw new Error(`Client with ID ${entryData.clientId} not found.`);
            
            const client = clientDoc.data() as Client;
            const partner = partnerDoc && partnerDoc.exists ? partnerDoc.data() as Client : null;

            const calculatedShares = calculateShares(entryData, client.segmentSettings);

            const dataToSave: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                ...calculatedShares,
                companyName: client.name,
                partnerId: entryData.hasPartner && partner ? partner.id : '',
                partnerName: entryData.hasPartner && partner ? partner.name : '',
                periodId: periodId,
                periodInvoiceNumber: periodInvoiceNumber,
                invoiceNumber: segmentInvoiceNumber, 
                enteredBy: user.name,
                createdAt: new Date().toISOString(),
                isDeleted: false,
            };
            
            await segmentDocRef.set(dataToSave);
            
            // قيد إثبات الدين على الشركة المصدرة مقابل حساب التسوية
            await recordFinancialTransaction({
              sourceType: 'segment',
              sourceId: segmentDocRef.id,
              date: entryDate,
              currency: dataToSave.currency,
              amount: dataToSave.total,
              debitAccountId: dataToSave.clientId, // الشركة مدينة لنا
              creditAccountId: financeMap.clearingAccountId, // حساب وسيط
              description: `إثبات ربح سكمنت من ${dataToSave.companyName}`,
              companyId: dataToSave.clientId,
              reference: segmentInvoiceNumber,
            }, { actorId: user.uid, actorName: user.name });

            // قيد دفع حصص الشركاء من الصندوق
            const partnerShares = (dataToSave.partnerShares && dataToSave.partnerShares.length > 0)
                ? dataToSave.partnerShares
                : (dataToSave.hasPartner && dataToSave.partnerId ? [{ partnerId: dataToSave.partnerId, partnerName: dataToSave.partnerName, share: dataToSave.partnerShare, partnerInvoiceNumber: await getNextVoucherNumber("PARTNER") }] : []);

            for (const share of partnerShares) {
                if (!share || !share.partnerId || !share.share) continue;
                
                await recordFinancialTransaction({
                    sourceType: 'segment_payout',
                    sourceId: segmentDocRef.id,
                    date: entryDate,
                    currency: dataToSave.currency,
                    amount: share.share,
                    debitAccountId: share.partnerId, // الشريك مدين لنا الآن بعد الدفع
                    creditAccountId: user.boxId!, // الدفع من صندوقنا
                    description: `دفع حصة الشريك ${share.partnerName} عن سكمنت ${dataToSave.companyName}`,
                    companyId: share.partnerId,
                    reference: share.partnerInvoiceNumber,
                }, { actorId: user.uid, actorName: user.name });
            }

            // قيد إثبات حصة الشركة كإيراد
             if (dataToSave.alrawdatainShare > 0) {
                 await recordFinancialTransaction({
                    sourceType: 'segment_revenue',
                    sourceId: segmentDocRef.id,
                    date: entryDate,
                    currency: dataToSave.currency,
                    amount: dataToSave.alrawdatainShare,
                    debitAccountId: financeMap.clearingAccountId, // نخفض حساب التسوية
                    creditAccountId: financeMap.revenueMap.segments, // نسجل الإيراد
                    description: `تسجيل حصة الشركة من ربح سكمنت ${dataToSave.companyName}`,
                }, { actorId: user.uid, actorName: user.name });
            }
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

        // --- STEP 1: READ (outside transaction) ---
        const segmentsQuery = db.collection('segments').where('periodId', '==', periodId);
        const segmentsSnap = await segmentsQuery.get();
        if (segmentsSnap.empty) {
            return { success: true, count: 0 };
        }
        
        const segmentIds = segmentsSnap.docs.map(doc => doc.id);
        const voucherRefsToDelete: FirebaseFirestore.DocumentReference[] = [];

        for (let i = 0; i < segmentIds.length; i += 30) {
            const chunk = segmentIds.slice(i, i + 30);
            const voucherQuery = db.collection('journal-vouchers').where('sourceId', 'in', chunk);
            const vouchersSnap = await voucherQuery.get();
            vouchersSnap.forEach(doc => voucherRefsToDelete.push(doc.ref));
        }
        
        const deletedVoucherRefsToDelete: FirebaseFirestore.DocumentReference[] = [];
        if (permanent) {
            for (let i = 0; i < voucherRefsToDelete.length; i += 30) {
                const chunkIds = voucherRefsToDelete.slice(i, i+30).map(ref => ref.id);
                const deletedVouchersQuery = db.collection('deleted-vouchers').where(FieldValue.documentId(), 'in', chunkIds);
                const deletedVouchersSnap = await deletedVouchersQuery.get();
                deletedVouchersSnap.forEach(doc => deletedVoucherRefsToDelete.push(doc.ref));
            }
        }


        // --- STEP 2: WRITE (inside transaction) ---
        await db.runTransaction(async (transaction) => {
            // Delete/update segment entries
            segmentsSnap.docs.forEach(doc => {
                if (permanent) {
                    transaction.delete(doc.ref);
                } else {
                    transaction.update(doc.ref, { isDeleted: true, deletedAt: now, deletedBy });
                }
            });

            // Delete/update journal vouchers
            for (const docRef of voucherRefsToDelete) {
                if (permanent) {
                    transaction.delete(docRef);
                } else {
                    transaction.update(docRef, { 
                        isDeleted: true, 
                        deletedAt: now, 
                        deletedBy: deletedBy 
                    });
                     const docSnap = await transaction.get(docRef);
                     if (docSnap.exists) {
                         const deletedVoucherRef = db.collection('deleted-vouchers').doc(docRef.id);
                         transaction.set(deletedVoucherRef, docSnap.data());
                     }
                }
            }
            
             if (permanent) {
                for (const docRef of deletedVoucherRefsToDelete) {
                    transaction.delete(docRef);
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
            const segmentsQuery = db.collection('segments').where('periodId', '==', periodId).where('isDeleted', '==', true);
            const segmentsSnap = await transaction.get(segmentsQuery);
            if (segmentsSnap.empty) {
                return;
            }

            const segmentIds = segmentsSnap.docs.map(doc => doc.id);
            const voucherRefsToRestore: FirebaseFirestore.DocumentReference[] = [];

            for (let i = 0; i < segmentIds.length; i += 30) {
                const chunk = segmentIds.slice(i, i + 30);
                const voucherQuery = db.collection('journal-vouchers')
                    .where('sourceId', 'in', chunk)
                    .where('isDeleted', '==', true);
                const vouchersSnap = await transaction.get(voucherQuery);
                vouchersSnap.forEach(doc => voucherRefsToRestore.push(doc.ref));
            }
            
            const updatePayload = {
                isDeleted: false,
                deletedAt: FieldValue.delete(),
                deletedBy: FieldValue.delete(),
                restoredAt,
                restoredBy,
            };
            
            segmentsSnap.docs.forEach(doc => {
                transaction.update(doc.ref, updatePayload);
            });
            
            for (const docRef of voucherRefsToRestore) {
                transaction.update(docRef, {
                    ...updatePayload,
                    status: 'restored',
                });

                 const deletedVoucherRef = db.collection('deleted-vouchers').doc(docRef.id);
                 transaction.delete(deletedVoucherRef);
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
        return { success: true, count: 1 }; // Simplified count
    } catch (e: any) {
        return { success: false, error: e.message, count: 0 };
    }
}

// Dummy functions to satisfy type requirements in other files temporarily
export async function updateSegmentEntry(entryId: string, data: any) { return { success: false, error: 'Not implemented' }; }
