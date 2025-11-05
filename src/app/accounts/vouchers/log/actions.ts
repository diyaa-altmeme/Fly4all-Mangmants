
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher, Client, Supplier, Box, User, AppSettings, BookingEntry, VisaBookingEntry, Subscription } from '@/lib/types';
import { normalizeVoucherType } from '@/lib/accounting/voucher-types';
import { parseISO } from 'date-fns';

export type Voucher = {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  currency: string;
  voucherType: string;
  normalizedType: string;
  companyName: string;
  boxName: string;
  officer: string;
  createdAt: string;
  notes: string;
  originalData?: any;
};

// This function needs to be defined to be used in the page
export async function getAllVouchers(
    clients: Client[],
    suppliers: Supplier[],
    boxes: Box[],
    users: User[],
    settings: AppSettings
): Promise<Voucher[]> {
    const db = await getDb();
    if (!db) return [];

    const snapshot = await db.collection('journal-vouchers').orderBy('createdAt', 'desc').limit(500).get();
    if (snapshot.empty) return [];
    
    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
    const boxMap = new Map(boxes.map(b => [b.id, b.name]));
    const userMap = new Map(users.map(u => [u.uid, u.name]));
    
    const getAccountName = (id: string) => {
        return clientMap.get(id) || supplierMap.get(id) || boxMap.get(id) || id;
    }

    return snapshot.docs.map(doc => {
        const data = doc.data() as JournalVoucher;
        
        const debitAmount = data.debitEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
        const creditAmount = data.creditEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
        const totalAmount = Math.max(debitAmount, creditAmount);
        
        let companyName = "حركات متعددة";
        if (data.debitEntries?.length === 1 && data.creditEntries?.length === 1) {
            companyName = getAccountName(data.creditEntries[0].accountId);
        } else if (data.originalData?.clientId) {
            companyName = clientMap.get(data.originalData.clientId) || data.originalData.clientId;
        } else if (data.originalData?.supplierId) {
            companyName = supplierMap.get(data.originalData.supplierId) || data.originalData.supplierId;
        }

        const boxId = data.originalData?.boxId || data.debitEntries?.find(e => boxMap.has(e.accountId))?.accountId || data.creditEntries?.find(e => boxMap.has(e.accountId))?.accountId;
        const boxName = boxId ? boxMap.get(boxId) || 'N/A' : 'N/A';

        const officer = data.officer || userMap.get(data.createdBy || '') || 'غير معروف';

        return {
            id: doc.id,
            invoiceNumber: data.invoiceNumber,
            date: data.date,
            totalAmount: totalAmount,
            currency: data.currency,
            voucherType: data.voucherType,
            normalizedType: normalizeVoucherType(data.voucherType),
            companyName: companyName,
            boxName: boxName,
            officer: officer,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : (data.createdAt as any).toDate().toISOString(),
            notes: data.notes || data.originalData?.details || '',
            originalData: data.originalData,
        };
    });
}

export async function permanentDeleteVoucher(voucherId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    
    try {
        const batch = db.batch();
        const voucherRef = db.collection('journal-vouchers').doc(voucherId);
        
        const voucherSnap = await voucherRef.get();
        if (!voucherSnap.exists) {
            throw new Error("Voucher not found to delete.");
        }
        
        const voucherData = voucherSnap.data() as JournalVoucher;
        
        // Delete the original source document if it exists
        if (voucherData.sourceType && voucherData.sourceId) {
             const sourceCollectionName = voucherData.sourceType.endsWith('s') ? voucherData.sourceType : `${voucherData.sourceType}s`;
             const sourceRef = db.collection(sourceCollectionName).doc(voucherData.sourceId);
             const sourceDoc = await sourceRef.get();
             if (sourceDoc.exists) {
                 batch.delete(sourceRef);
             }
        }
        
        // Delete the journal voucher itself
        batch.delete(voucherRef);

        await batch.commit();

        return { success: true };
    } catch(e: any) {
        console.error("Error permanently deleting voucher:", e);
        return { success: false, error: e.message };
    }
}
