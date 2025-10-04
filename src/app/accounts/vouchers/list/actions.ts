
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { ReceiptVoucher, Client, Supplier, AppSettings, Box, User, JournalVoucher, JournalEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getSettings } from '@/app/settings/actions';
import { parseISO } from 'date-fns';
import { createAuditLog } from '@/app/system/activity-log/actions';
import { getCurrentUserFromSession } from '@/app/auth/actions';

export type Voucher = JournalVoucher & {
    voucherTypeLabel: string;
    companyName?: string;
    phone?: string;
    boxName?: string;
};

// Helper function to process dates, which might be Timestamps
const processVoucherData = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;
    // Ensure date fields are consistently strings
    let date = new Date().toISOString();
    if (data.date) {
        if (typeof data.date.toDate === 'function') {
            date = data.date.toDate().toISOString();
        } else {
            date = data.date;
        }
    } else if(data.createdAt) {
         if (typeof data.createdAt.toDate === 'function') {
            date = data.createdAt.toDate().toISOString();
        } else {
            date = data.createdAt;
        }
    }
    
    let createdAt = date;
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAt = data.createdAt.toDate().toISOString();
    } else if (data.createdAt) {
        createdAt = data.createdAt;
    }
    
    let updatedAt = date;
    if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        updatedAt = data.updatedAt.toDate().toISOString();
    } else if (data.updatedAt) {
        updatedAt = data.updatedAt;
    }


    // Deep check for nested dates, especially in originalData
    if (data.originalData && data.originalData.date && typeof data.originalData.date.toDate === 'function') {
        data.originalData.date = data.originalData.date.toDate().toISOString();
    }
    return { ...data, id: doc.id, date, createdAt, updatedAt };
};

export const getVoucherById = async (id: string): Promise<any | null> => {
    const db = await getDb();
    if (!db) return null;

    // The primary collection for all operations is now journal-vouchers
    const docRef = db.collection('journal-vouchers').doc(id);
    const doc = await docRef.get();

    if (doc.exists) {
        return processVoucherData(doc);
    }
    
    return null;
};


// This function fetches all types of vouchers and combines them.
export const getAllVouchers = async (clients: Client[], suppliers: Supplier[], boxes: Box[], users: User[], settings: AppSettings): Promise<Voucher[]> => {
    try {
        const db = await getDb();
        if (!db) {
            console.log("Database not available, returning empty list of vouchers.");
            return [];
        }

        const accountsMap = new Map<string, string>();
        clients.forEach(c => accountsMap.set(c.id, c.name));
        suppliers.forEach(s => accountsMap.set(s.id, s.name));
        boxes.forEach(b => accountsMap.set(b.id, b.name));
        settings.voucherSettings?.expenseAccounts?.forEach(account => {
            accountsMap.set(`expense_${account.id}`, account.name);
        });
        
        const boxesMap = new Map(boxes.map(b => [b.id, b.name]));
        const usersMap = new Map(users.map((u: any) => [u.uid, u.name]));

        const journalVouchersSnapshot = await db.collection('journal-vouchers').orderBy('createdAt', 'desc').limit(500).get();
        
        const allVouchers: Voucher[] = [];
        
        const getVoucherTypeLabel = (type: string) => {
            switch(type) {
                case 'journal_from_standard_receipt': return 'سند قبض عادي';
                case 'journal_from_distributed_receipt': return 'سند قبض مخصص';
                case 'journal_from_payment': return 'سند دفع';
                case 'journal_from_expense': return 'سند مصاريف';
                case 'journal_voucher': return 'قيد محاسبي';
                case 'journal_from_remittance': return 'حوالة مستلمة';
                case 'booking': return 'حجز طيران';
                case 'visa': return 'طلب فيزا';
                case 'subscription': return 'اشتراك';
                default: return type;
            }
        };

        journalVouchersSnapshot.forEach(doc => {
            const data = processVoucherData(doc);
            if (!data) return;
            
            const description = data.notes || '';
            const totalDebit = data.debitEntries?.reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0) || 0;
            const totalCredit = data.creditEntries?.reduce((sum: number, entry: any) => sum + (entry.amount || 0), 0) || 0;

            
            // Try to find a meaningful main party for the transaction
            const mainDebitPartyId = data.debitEntries?.[0]?.accountId;
            const mainCreditPartyId = data.creditEntries?.[0]?.accountId;
            
            let mainPartyId = 'multiple';

            if (data.originalData?.from) mainPartyId = data.originalData.from;
            else if (data.originalData?.payeeId) mainPartyId = data.originalData.payeeId;
            else if (data.originalData?.toSupplierId) mainPartyId = data.originalData.toSupplierId;
            else if (data.originalData?.accountId) mainPartyId = data.originalData.accountId;
            else if (data.voucherType?.includes('receipt')) mainPartyId = mainCreditPartyId;
            else if (data.voucherType?.includes('payment') || data.voucherType?.includes('expense')) mainPartyId = mainDebitPartyId;

            const partyInfo = clients.find(c => c.id === mainPartyId) || suppliers.find(s => s.id === mainPartyId);
            const companyName = partyInfo?.name || data.originalData?.companyName || data.originalData?.from || data.originalData?.payee || accountsMap.get(mainPartyId) || 'حركات متعددة';
            const phone = partyInfo?.phone || data.originalData?.phoneNumber;
            
            const boxId = data.originalData?.boxId || data.originalData?.toBox || data.creditEntries?.find((e: any) => boxesMap.has(e.accountId))?.accountId || data.debitEntries?.find((e: any) => boxesMap.has(e.accountId))?.accountId || '';

            allVouchers.push({ 
                ...data, 
                id: doc.id,
                voucherTypeLabel: getVoucherTypeLabel(data.voucherType),
                companyName: companyName,
                phone: phone,
                officer: usersMap.get(data.createdBy) || data.officer || 'غير معروف',
                boxName: boxesMap.get(boxId) || 'N/A',
                // For simplicity in the main table, we might just show total movement
                totalAmount: totalDebit, 
            });
        });

        // Add a secondary, stable sort key (the ID) to prevent hydration mismatches.
        return allVouchers.sort((a, b) => {
            const dateA = a.createdAt ? parseISO(a.createdAt).getTime() : parseISO(a.date).getTime();
            const dateB = b.createdAt ? parseISO(b.createdAt).getTime() : parseISO(b.date).getTime();
            if (dateB !== dateA) {
                return dateB - dateA;
            }
            return b.id.localeCompare(a.id); // Secondary sort by ID if dates are identical
        });

    } catch (error) {
        console.error("Error getting all vouchers: ", String(error));
        return [];
    }
};

export async function deleteVoucher(id: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const batch = db.batch();
    
    try {
        const voucherRef = db.collection('journal-vouchers').doc(id);
        const voucherDoc = await voucherRef.get();
        if (!voucherDoc.exists) {
             throw new Error("Voucher not found");
        }
        const voucherData = voucherDoc.data();
        const voucherNumber = voucherData?.invoiceNumber || id;
        
        // If the voucher was created from a booking, delete the original booking too.
        if (voucherData?.originalData?.bookingId) {
            const bookingRef = db.collection('bookings').doc(voucherData.originalData.bookingId);
            batch.delete(bookingRef);
        } else if (voucherData?.originalData?.visaBookingId) {
             const visaBookingRef = db.collection('visaBookings').doc(voucherData.originalData.visaBookingId);
             batch.delete(visaBookingRef);
        }

        // Delete the journal voucher itself
        batch.delete(voucherRef);
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'VOUCHER',
            description: `حذف السند رقم: ${voucherNumber}`,
        });

        revalidatePath('/accounts/vouchers/list');
        revalidatePath('/bookings'); // In case a booking was deleted
        revalidatePath('/visas'); // In case a visa booking was deleted
        revalidatePath('/reports', 'layout');

        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting voucher ${id}:`, String(error));
        return { success: false, error: "فشل حذف السند." };
    }
}

export async function updateVoucher(id: string, data: Partial<JournalVoucher>): Promise<{ success: boolean; error?: string }> {
     const db = await getDb();
     if (!db) return { success: false, error: "Database not available." };
     const user = await getCurrentUserFromSession();
     if (!user) return { success: false, error: "Unauthorized" };

     try {
        const dataToUpdate: Partial<JournalVoucher> & { updatedAt: string } = {
            ...JSON.parse(JSON.stringify(data)),
            updatedAt: new Date().toISOString(),
        };
        
        // Ensure date is stored as a string if it's a Date object
        if (dataToUpdate.date instanceof Date) {
            dataToUpdate.date = dataToUpdate.date.toISOString();
        }

        await db.collection('journal-vouchers').doc(id).update(dataToUpdate);
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'VOUCHER',
            description: `عدل بيانات السند (ID: ${id}).`,
        });

        revalidatePath('/accounts/vouchers/list');
        revalidatePath('/reports/account-statement');
        return { success: true };
     } catch (error: any) {
        console.error(`Error updating voucher ${id}:`, String(error));
        return { success: false, error: "فشل تحديث السند." };
     }
}

export async function deleteAllVouchers(): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const collections = [
        'journal-vouchers',
    ];

    try {
        for (const collectionName of collections) {
            try {
                const snapshot = await db.collection(collectionName).select().get();
                if (snapshot.empty) {
                    continue;
                }

                const batchSize = 500;
                for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                    const batch = db.batch();
                    const chunk = snapshot.docs.slice(i, i + batchSize);
                    chunk.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }
            } catch (e) {
                if ((e as any).code === 5) {
                    console.log(`Collection ${collectionName} not found, skipping deletion.`);
                    continue;
                }
                throw e;
            }
        }
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'VOUCHER',
            description: `حذف جميع السندات من النظام.`,
        });

        revalidatePath('/accounts/vouchers/list');
        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting all vouchers:`, String(error));
        return { success: false, error: "فشل حذف جميع السندات." };
    }
}
