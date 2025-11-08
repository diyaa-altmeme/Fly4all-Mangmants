'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, Client, Supplier, Currency } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { FieldValue } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import { getNextVoucherNumber } from '@/lib/sequences';
import { FieldValue, type Firestore, type QueryDocumentSnapshot, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import { getFinanceMap } from '@/lib/finance/posting';
import { createAuditLog } from '../system/activity-log/actions';
import { recordFinancialTransaction } from '@/lib/finance/financial-transactions';


const checkSegmentPermission = async () => {
  const user = await getCurrentUserFromSession();

  if (!user || 'isClient' in user) {
    throw new Error("Access Denied: User not authenticated or does not have required permissions.");
  }

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
        await checkSegmentPermission();
        const db = await getDb();
        if (!db) return [];
        
        let query = db.collection('segments').orderBy('toDate', 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        const allSegments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));

        return allSegments.filter(s => !!s.isDeleted === includeDeleted);

    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
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
    
    const alrawdatainSharePercentage = data.hasPartner ? (data.alrawdatainSharePercentage ?? 50) : 100;
    const alrawdatainShare = total * (alrawdatainSharePercentage / 100);
    const partnerShare = data.hasPartner ? total - alrawdatainShare : 0;
    
    return { ticketProfits, otherProfits, total, alrawdatainShare, partnerShare };
}


const SEGMENT_PERIOD_SOURCE_TYPE = 'segment_period';

type VoucherPredicate = (data: DocumentData) => boolean;

async function findVoucherIdBySource(
  db: Firestore,
  sourceType: string,
  sourceId: string,
  predicate?: VoucherPredicate,
): Promise<string | undefined> {
  const snapshot = await db.collection('journal-vouchers')
    .where('sourceType', '==', sourceType)
    .where('sourceId', '==', sourceId)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!predicate || predicate(data)) {
      return doc.id;
    }
  }

  return undefined;
}

async function softDeleteVoucher(
  db: Firestore,
  voucherId: string,
  deletedBy: string,
  timestampISO?: string,
) {
  const voucherRef = db.collection('journal-vouchers').doc(voucherId);
  const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);
  const ledgerCollection = db.collection('journal-ledger');
  const nowISO = timestampISO || new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const voucherSnap = await transaction.get(voucherRef);
    if (!voucherSnap.exists) {
      return;
    }

    transaction.update(voucherRef, {
      isDeleted: true,
      deletedAt: nowISO,
      deletedBy,
      status: 'deleted',
    });

    transaction.set(
      deletedVoucherRef,
      {
        ...voucherSnap.data(),
        deletedAt: nowISO,
        deletedBy,
      },
      { merge: true },
    );

    const ledgerSnap = await transaction.get(ledgerCollection.where('voucherId', '==', voucherId));
    ledgerSnap.forEach((doc) => {
      transaction.update(doc.ref, {
        isDeleted: true,
        deletedAt: nowISO,
        deletedBy,
      });
    });
  });
}

async function softDeleteSegmentDocument(
  db: Firestore,
  doc: QueryDocumentSnapshot,
  deletedBy: string,
) {
  const nowISO = new Date().toISOString();
  const data = doc.data() as SegmentEntry;

  await db.runTransaction(async (transaction) => {
    transaction.update(doc.ref, {
      isDeleted: true,
      deletedAt: nowISO,
      deletedBy,
    });
  });

  if (data.companyVoucherId) {
    await softDeleteVoucher(db, data.companyVoucherId, deletedBy, nowISO);
  }

  if (data.revenueVoucherId) {
    await softDeleteVoucher(db, data.revenueVoucherId, deletedBy, nowISO);
  }

  for (const share of data.partnerShares || []) {
    if (share?.voucherId) {
      await softDeleteVoucher(db, share.voucherId, deletedBy, nowISO);
    }
  }
}

async function permanentDeleteVoucher(db: Firestore, voucherId: string) {
  const voucherRef = db.collection('journal-vouchers').doc(voucherId);
  const ledgerCollection = db.collection('journal-ledger');
  const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);

  const ledgerSnap = await ledgerCollection.where('voucherId', '==', voucherId).get();

  const batch = db.batch();
  batch.delete(voucherRef);
  ledgerSnap.forEach((doc) => batch.delete(doc.ref));
  batch.delete(deletedVoucherRef);
  await batch.commit();
}

async function permanentDeleteSegmentDocument(db: Firestore, doc: QueryDocumentSnapshot) {
  const data = doc.data() as SegmentEntry;

  const voucherIds = new Set<string>();
  if (data.companyVoucherId) voucherIds.add(data.companyVoucherId);
  if (data.revenueVoucherId) voucherIds.add(data.revenueVoucherId);
  for (const share of data.partnerShares || []) {
    if (share?.voucherId) voucherIds.add(share.voucherId);
  }

  await doc.ref.delete();

  for (const voucherId of voucherIds) {
    await permanentDeleteVoucher(db, voucherId);
  }
}

async function restoreVoucher(
  db: Firestore,
  voucherId: string,
  restoredBy: string,
  timestampISO?: string,
) {
  const voucherRef = db.collection('journal-vouchers').doc(voucherId);
  const deletedVoucherRef = db.collection('deleted-vouchers').doc(voucherId);
  const ledgerCollection = db.collection('journal-ledger');
  const nowISO = timestampISO || new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const voucherSnap = await transaction.get(voucherRef);
    if (!voucherSnap.exists) {
      return;
    }

    transaction.update(voucherRef, {
      isDeleted: false,
      deletedAt: FieldValue.delete(),
      deletedBy: FieldValue.delete(),
      restoredAt: nowISO,
      restoredBy,
      status: 'restored',
    });

    transaction.delete(deletedVoucherRef);

    const ledgerSnap = await transaction.get(ledgerCollection.where('voucherId', '==', voucherId));
    ledgerSnap.forEach((doc) => {
      transaction.update(doc.ref, {
        isDeleted: false,
        deletedAt: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
        restoredAt: nowISO,
        restoredBy,
      });
    });
  });
}

async function restoreSegmentDocument(
  db: Firestore,
  doc: QueryDocumentSnapshot,
  restoredBy: string,
) {
  const nowISO = new Date().toISOString();
  const data = doc.data() as SegmentEntry;

  await doc.ref.update({
    isDeleted: false,
    deletedAt: FieldValue.delete(),
    deletedBy: FieldValue.delete(),
    restoredAt: nowISO,
    restoredBy,
  });

  if (data.companyVoucherId) {
    await restoreVoucher(db, data.companyVoucherId, restoredBy, nowISO);
  }

  if (data.revenueVoucherId) {
    await restoreVoucher(db, data.revenueVoucherId, restoredBy, nowISO);
  }

  for (const share of data.partnerShares || []) {
    if (share?.voucherId) {
      await restoreVoucher(db, share.voucherId, restoredBy, nowISO);
    }
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
        const financeMap = await getFinanceMap();

        if (!financeMap.receivableAccountId) throw new Error("حساب الذمم المدينة غير محدد في الإعدادات.");
        if (!financeMap.clearingAccountId) throw new Error("حساب التسوية غير محدد في الإعدادات.");
        if (!financeMap.revenueMap?.segments) throw new Error("حساب إيرادات السكمنت غير محدد.");

        if (!entries || entries.length === 0) {
            throw new Error('لا توجد سجلات لحفظها.');
        }

        const periodId = periodIdToReplace || entries[0]?.periodId || db.collection('temp').doc().id;

        const existingSegmentsMap = new Map<string, QueryDocumentSnapshot>();
        if (periodIdToReplace) {
            const existingSnap = await db.collection('segments')
                .where('periodId', '==', periodIdToReplace)
                .where('isDeleted', '==', false)
                .get();
            existingSnap.forEach(doc => existingSegmentsMap.set(doc.id, doc));
        }

        const existingPeriodInvoice = existingSegmentsMap.size > 0
            ? (existingSegmentsMap.values().next().value.data() as SegmentEntry).periodInvoiceNumber
            : undefined;

        const periodInvoiceNumber = entries[0]?.periodInvoiceNumber || existingPeriodInvoice || await getNextVoucherNumber("SEG");

        const processedIds = new Set<string>();
        const updatedEntries: SegmentEntry[] = [];
        const processedDocs: DocumentReference[] = [];

        let totalProfit = 0;
        let totalCompanyShare = 0;
        let totalPartnerShare = 0;
        let periodCurrency = entries[0]?.currency || existingSegmentsMap.values().next()?.value?.data()?.currency || 'USD';
        let periodEntryDate = entries[0]?.entryDate || new Date().toISOString();
        let periodFrom = entries[0]?.fromDate;
        let periodTo = entries[0]?.toDate;

        for (const entryData of entries) {
            const entryId = (entryData as any).id && existingSegmentsMap.has((entryData as any).id)
                ? (entryData as any).id as string
                : undefined;

            const segmentDocRef = entryId
                ? db.collection('segments').doc(entryId)
                : db.collection('segments').doc();

            const existingSnapshot = entryId ? existingSegmentsMap.get(entryId) : undefined;
            const existingData = existingSnapshot?.data() as SegmentEntry | undefined;

            const entryDate = entryData.entryDate ? new Date(entryData.entryDate) : new Date();
            const entryDateISO = entryDate.toISOString();

            const [clientDoc, partnerDoc] = await Promise.all([
                db.collection('clients').doc(entryData.clientId).get(),
                entryData.partnerId ? db.collection('clients').doc(entryData.partnerId).get() : Promise.resolve(null),
            ]);

            if (!clientDoc.exists) throw new Error(`Client with ID ${entryData.clientId} not found.`);

            const client = clientDoc.data() as Client;
            const partner = partnerDoc && partnerDoc.exists ? partnerDoc.data() as Client : null;

            const calculatedShares = calculateShares(entryData, client.segmentSettings);

            const companyInvoiceNumber = entryData.invoiceNumber || existingData?.invoiceNumber || await getNextVoucherNumber("COMP");

            const existingPartnerMap = new Map<string, { voucherId?: string }>();
            for (const share of existingData?.partnerShares || []) {
                existingPartnerMap.set(share.partnerId, { voucherId: share.voucherId });
            }

            const partnerSharesWithInvoices = await Promise.all(
                (entryData.partnerShares || []).map(async (p: any) => {
                    if (!p.partnerId) return null;
                    const existingShare = existingPartnerMap.get(p.partnerId);
                    const partnerInvoiceNumber = p.partnerInvoiceNumber || existingData?.partnerShares?.find(s => s.partnerId === p.partnerId)?.partnerInvoiceNumber || await getNextVoucherNumber("PARTNER");
                    return {
                        ...p,
                        partnerInvoiceNumber,
                        voucherId: existingShare?.voucherId,
                    };
                })
            ).then(results => results.filter(Boolean));

            const partnerShareTotal = partnerSharesWithInvoices.reduce((sum: number, share: any) => sum + (Number(share.share) || 0), 0);

            const baseCreatedAt = existingData?.createdAt || new Date().toISOString();

            const dataToSave: Omit<SegmentEntry, 'id'> = {
                ...entryData,
                ...calculatedShares,
                partnerShares: partnerSharesWithInvoices as any,
                companyName: client.name,
                partnerId: entryData.hasPartner && partner ? partner.id : '',
                partnerName: entryData.hasPartner && partner ? partner.name : '',
                periodId,
                periodInvoiceNumber,
                invoiceNumber: companyInvoiceNumber,
                enteredBy: existingData?.enteredBy || user.name,
                createdAt: baseCreatedAt,
                isDeleted: false,
            };

            dataToSave.partnerShare = partnerShareTotal;

            dataToSave.entryDate = entryDateISO;
            periodCurrency = dataToSave.currency || periodCurrency;
            periodEntryDate = entryDateISO;
            periodFrom = dataToSave.fromDate || periodFrom;
            periodTo = dataToSave.toDate || periodTo;

            if (existingData?.revenueVoucherId) {
                await softDeleteVoucher(db, existingData.revenueVoucherId, user.name || user.uid);
            }

            const existingCompanyVoucherId = existingData?.companyVoucherId
                || await findVoucherIdBySource(db, 'segment', segmentDocRef.id);

            const companyVoucher = await recordFinancialTransaction({
                sourceType: 'segment',
                sourceId: segmentDocRef.id,
                date: entryDate,
                currency: dataToSave.currency,
                amount: dataToSave.total,
                debitAccountId: dataToSave.clientId,
                creditAccountId: financeMap.clearingAccountId,
                description: `إثبات ربح سكمنت من ${dataToSave.companyName}`,
                companyId: dataToSave.clientId,
                reference: companyInvoiceNumber,
            }, {
                actorId: user.uid,
                actorName: user.name,
                meta: {
                    segmentId: segmentDocRef.id,
                    periodId,
                    periodInvoiceNumber,
                    companyId: dataToSave.clientId,
                },
                voucherId: existingCompanyVoucherId,
            });

            dataToSave.companyVoucherId = companyVoucher.voucherId;

            const handledPartnerIds = new Set<string>();

            for (const share of (dataToSave.partnerShares || [])) {
                if (!share || !share.partnerId || !share.share) continue;

                const existingVoucherId = share.voucherId
                    || await findVoucherIdBySource(db, 'segment_payout', segmentDocRef.id, (voucher) => {
                        const unified = voucher.meta?.unifiedTransaction;
                        return unified?.creditAccountId === share.partnerId || unified?.debitAccountId === share.partnerId;
                    });

                const partnerVoucher = await recordFinancialTransaction({
                    sourceType: 'segment_payout',
                    sourceId: segmentDocRef.id,
                    date: entryDate,
                    currency: dataToSave.currency,
                    amount: share.share,
                    debitAccountId: financeMap.clearingAccountId,
                    creditAccountId: share.partnerId,
                    description: `تسجيل حصة الشريك ${share.partnerName} عن سكمنت ${dataToSave.companyName}`,
                    companyId: share.partnerId,
                    reference: share.partnerInvoiceNumber,
                }, {
                    actorId: user.uid,
                    actorName: user.name,
                    meta: {
                        segmentId: segmentDocRef.id,
                        periodId,
                        partnerId: share.partnerId,
                    },
                    voucherId: existingVoucherId,
                });

                share.voucherId = partnerVoucher.voucherId;
                handledPartnerIds.add(share.partnerId);
            }

            for (const [partnerId, info] of existingPartnerMap.entries()) {
                if (!handledPartnerIds.has(partnerId) && info.voucherId) {
                    await softDeleteVoucher(db, info.voucherId, user.name || user.uid);
                }
            }

            await segmentDocRef.set(dataToSave);

            processedIds.add(segmentDocRef.id);
            processedDocs.push(segmentDocRef);
            updatedEntries.push({ id: segmentDocRef.id, ...dataToSave });

            totalProfit += dataToSave.total;
            totalCompanyShare += dataToSave.alrawdatainShare;
            totalPartnerShare += partnerShareTotal;
        }

        for (const [segmentId, snapshot] of existingSegmentsMap.entries()) {
            if (!processedIds.has(segmentId)) {
                await softDeleteSegmentDocument(db, snapshot, user.name || user.uid);
            }
        }

        const existingPeriodVoucherId = await findVoucherIdBySource(db, SEGMENT_PERIOD_SOURCE_TYPE, periodId);

        let periodVoucherId: string | undefined = existingPeriodVoucherId;

        if (totalCompanyShare > 0) {
            const periodVoucher = await recordFinancialTransaction({
                sourceType: SEGMENT_PERIOD_SOURCE_TYPE,
                sourceId: periodId,
                date: new Date(periodEntryDate),
                currency: periodCurrency,
                amount: totalCompanyShare,
                debitAccountId: financeMap.clearingAccountId,
                creditAccountId: financeMap.revenueMap.segments,
                description: `تسجيل حصة الشركة لفترة سكمنت ${periodInvoiceNumber}`,
                companyId: financeMap.revenueMap.segments,
                reference: periodInvoiceNumber,
            }, {
                actorId: user.uid,
                actorName: user.name,
                meta: {
                    periodId,
                    periodInvoiceNumber,
                    totalProfit,
                    companyShare: totalCompanyShare,
                    partnerShare: totalPartnerShare,
                    fromDate: periodFrom,
                    toDate: periodTo,
                },
                voucherId: existingPeriodVoucherId,
            });

            periodVoucherId = periodVoucher.voucherId;
        } else if (existingPeriodVoucherId) {
            await softDeleteVoucher(db, existingPeriodVoucherId, user.name || user.uid);
            periodVoucherId = undefined;
        }

        if (periodVoucherId) {
            await Promise.all(processedDocs.map(ref => ref.update({ periodVoucherId })));
        } else if (processedDocs.length > 0) {
            await Promise.all(processedDocs.map(ref => ref.update({ periodVoucherId: FieldValue.delete() })));
        }

        revalidatePath('/segments');
        revalidatePath('/reports/account-statement');
        revalidatePath('/accounts/vouchers/list');
        return { success: true, newEntries: updatedEntries };

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
        const deletedBy = user.name || user.uid;

        const segmentsSnap = await db.collection('segments').where('periodId', '==', periodId).get();
        if (segmentsSnap.empty) {
            return { success: true, count: 0 };
        }

        const activeSegments = segmentsSnap.docs.filter(doc => !doc.data()?.isDeleted);
        const processedDocs = permanent ? segmentsSnap.docs : activeSegments;

        if (processedDocs.length === 0 && !permanent) {
            return { success: true, count: 0 };
        }

        for (const doc of processedDocs) {
            if (permanent) {
                await permanentDeleteSegmentDocument(db, doc);
            } else {
                await softDeleteSegmentDocument(db, doc, deletedBy);
            }
        }

        const periodVoucherId = await findVoucherIdBySource(db, SEGMENT_PERIOD_SOURCE_TYPE, periodId);
        if (periodVoucherId) {
            if (permanent) {
                await permanentDeleteVoucher(db, periodVoucherId);
            } else {
                await softDeleteVoucher(db, periodVoucherId, deletedBy);
            }
        }

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'SEGMENT',
            description: `${permanent ? 'حذف نهائي' : 'حذف'} فترة سكمنت (ID: ${periodId}) وجميع سجلاتها المرتبطة.`,
            targetId: periodId,
        });

        revalidatePath('/segments');
        revalidatePath('/system/deleted-log');
        revalidatePath('/accounts/vouchers/list');
        revalidatePath('/reports/account-statement');
        return { success: true, count: processedDocs.length };

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

        const segmentsSnap = await db.collection('segments')
            .where('periodId', '==', periodId)
            .where('isDeleted', '==', true)
            .get();

        if (segmentsSnap.empty) {
            return { success: true, count: 0 };
        }

        for (const doc of segmentsSnap.docs) {
            await restoreSegmentDocument(db, doc, restoredBy);
        }

        const periodVoucherId = await findVoucherIdBySource(db, SEGMENT_PERIOD_SOURCE_TYPE, periodId, (data) => data.isDeleted === true);
        if (periodVoucherId) {
            await restoreVoucher(db, periodVoucherId, restoredBy, restoredAt);
        }

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
        revalidatePath('/accounts/vouchers/list');
        revalidatePath('/reports/account-statement');
        return { success: true, count: segmentsSnap.size };
    } catch (e: any) {
        return { success: false, error: e.message, count: 0 };
    }
}

export async function updateSegmentEntry(entryId: string, data: any) { return { success: false, error: 'Not implemented' }; }
    