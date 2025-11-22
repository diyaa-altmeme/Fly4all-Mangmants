

'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { VisaBookingEntry, JournalEntry, VisaPassenger } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '@/app/(auth)/actions';
import { format, parseISO } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';
import { getSettings } from '@/app/settings/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';
import { recordFinancialTransaction } from '@/lib/finance/financial-transactions';

export async function getVisaBookings(includeDeleted = false): Promise<VisaBookingEntry[]> {
    const settings = await getSettings();
    if (!settings.databaseStatus?.isDatabaseConnected) {
        console.log("Database connection is disabled in settings. Skipping getVisaBookings fetch.");
        return [];
    }
    
    const db = await getDb();
    if (!db) return [];

    try {
        let query: FirebaseFirestore.Query = db.collection('visaBookings');
        
        const snapshot = await query.orderBy('submissionDate', 'desc').get();
        if (snapshot.empty) return [];

        const allBookings = snapshot.docs.map(doc => {
             const data = doc.data();
            return {
                id: doc.id,
                ...data,
                isDeleted: data.isDeleted || false,
                passengers: data.passengers || [],
            } as VisaBookingEntry;
        });

        return allBookings.filter(b => !!b.isDeleted === includeDeleted);

    } catch (error) {
        console.error("Error getting visa bookings from Firestore: ", String(error));
        return [];
    }
}


export async function addVisaBooking(bookingData: Omit<VisaBookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>): Promise<{ success: boolean; error?: string; newBooking?: VisaBookingEntry }> {
    const user = await getCurrentUserFromSession();
    if (!user || !('role' in user)) return { success: false, error: "User not authenticated." };

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const bookingRef = db.collection('visaBookings').doc();

    try {
        const newInvoiceNumber = await getNextVoucherNumber('VS');
        const totalSale = bookingData.passengers.reduce((acc, p) => acc + (p.salePrice || 0), 0);
        
        const dataToSave: Omit<VisaBookingEntry, 'id'> = {
            ...bookingData,
            invoiceNumber: newInvoiceNumber,
            supplierId: bookingData.supplierId || '',
            clientId: bookingData.clientId || '',
            boxId: bookingData.boxId || '',
            currency: bookingData.currency || 'USD',
            submissionDate: bookingData.submissionDate || new Date().toISOString(),
            notes: bookingData.notes || '',
            passengers: bookingData.passengers.map(p => ({...p})),
            isEntered: true, // Now creates a journal entry
            isAudited: false,
            isDeleted: false,
            enteredBy: user.name,
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        
        await recordFinancialTransaction({
            invoiceNumber: newInvoiceNumber,
            sourceType: 'visa',
            sourceId: bookingRef.id,
            date: new Date(dataToSave.submissionDate),
            currency: dataToSave.currency,
            amount: totalSale,
            debitAccountId: dataToSave.clientId,
            creditAccountId: dataToSave.supplierId,
            description: `طلب فيزا لـ ${dataToSave.passengers[0].name}`,
            meta: dataToSave,
        }, { actorId: user.uid, actorName: user.name });


        await bookingRef.set(dataToSave);
        
        const batch = db.batch();
        batch.update(db.collection('clients').doc(dataToSave.clientId), { useCount: FieldValue.increment(1) });
        if (dataToSave.supplierId) {
            batch.update(db.collection('clients').doc(dataToSave.supplierId), { useCount: FieldValue.increment(1) });
        }
        if(dataToSave.boxId) {
             batch.update(db.collection('boxes').doc(dataToSave.boxId), { useCount: FieldValue.increment(1) });
        }
        await batch.commit();
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'BOOKING',
            targetId: bookingRef.id,
            description: `أنشأ طلب فيزا جديدًا برقم فاتورة: ${newInvoiceNumber}`,
        });


        revalidatePath('/visas');
        revalidatePath('/accounts/vouchers/list');

        const newBooking: VisaBookingEntry = { id: bookingRef.id, ...dataToSave };
        return { success: true, newBooking };
    } catch (error: any) {
        console.error("Error adding visa booking: ", String(error));
        return { success: false, error: error.message || "Failed to add visa booking." };
    }
}


export async function addMultipleVisaBookings(bookingsData: Omit<VisaBookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>[]): Promise<{ success: boolean; count: number; error?: string; newBookings?: VisaBookingEntry[] }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, count: 0, error: "User not authenticated." };
    
    const db = await getDb();
    if (!db) return { success: false, count: 0, error: "Database not available." };

    const createdBookings: VisaBookingEntry[] = [];
    const invoiceNumbers: string[] = [];

    for (const bookingData of bookingsData) {
        const batch = db.batch();
        const newInvoiceNumber = await getNextVoucherNumber('VS');
        const bookingRef = db.collection('visaBookings').doc();
        const totalSale = bookingData.passengers.reduce((acc, p) => acc + (p.salePrice || 0), 0);
        
        const dataToSave: Omit<VisaBookingEntry, 'id'> = {
            ...bookingData,
            invoiceNumber: newInvoiceNumber,
            isEntered: true,
            isAudited: false,
            isDeleted: false,
            enteredBy: user.name,
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await recordFinancialTransaction({
            invoiceNumber: newInvoiceNumber,
            sourceType: 'visa',
            sourceId: bookingRef.id,
            date: new Date(dataToSave.submissionDate),
            currency: dataToSave.currency,
            amount: totalSale,
            debitAccountId: dataToSave.clientId,
            creditAccountId: dataToSave.supplierId,
            description: `طلب فيزا لـ ${dataToSave.passengers[0].name}`,
            meta: dataToSave,
        }, { actorId: user.uid, actorName: user.name });

        batch.set(bookingRef, dataToSave);

        batch.update(db.collection('clients').doc(dataToSave.clientId), { useCount: FieldValue.increment(1) });
        if(dataToSave.supplierId) {
            batch.update(db.collection('clients').doc(dataToSave.supplierId), { useCount: FieldValue.increment(1) });
        }
        if (dataToSave.boxId) {
            batch.update(db.collection('boxes').doc(dataToSave.boxId), { useCount: FieldValue.increment(1) });
        }
        
        createdBookings.push({ id: bookingRef.id, ...dataToSave });
        invoiceNumbers.push(newInvoiceNumber);
        await batch.commit();
    }

    try {

        if (createdBookings.length > 0) {
            await createAuditLog({
                userId: user.uid,
                userName: user.name,
                action: 'CREATE',
                targetType: 'BOOKING',
                description: `أضاف ${createdBookings.length} طلبات فيزا بشكل جماعي: ${invoiceNumbers.join(', ')}.`,
            });
    
            revalidatePath('/visas');
            revalidatePath('/accounts/vouchers/list');
        }

        return { success: true, count: createdBookings.length, newBookings: createdBookings };
    } catch (error: any) {
        console.error("Error committing batch for multiple visa bookings:", error);
        return { success: false, count: 0, error: "Failed to save visa bookings in batch." };
    }
}


export async function updateVisaBooking(bookingId: string, bookingData: Partial<Omit<VisaBookingEntry, 'id'>>): Promise<{ success: boolean; error?: string; updatedBooking?: VisaBookingEntry }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
     const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        const dataToUpdate: Partial<VisaBookingEntry> = { 
            ...bookingData, 
            updatedAt: new Date().toISOString() 
        };

        if ('id' in dataToUpdate) {
            delete (dataToUpdate as any).id;
        }
        if (dataToUpdate.passengers) {
            dataToUpdate.passengers = dataToUpdate.passengers.map(p => ({...p}));
        }

        await db.collection('visaBookings').doc(bookingId).update(dataToUpdate);
        
        // Find and update the related journal voucher
        const voucherQuery = await db.collection('journal-vouchers')
            .where('sourceId', '==', bookingId)
            .where('sourceType', '==', 'visa')
            .limit(1)
            .get();
        
        if (!voucherQuery.empty) {
            const voucherDoc = voucherQuery.docs[0];
            await voucherDoc.ref.update({
                meta: bookingData,
                originalData: bookingData,
                notes: `(تعديل) طلب فيزا لـ ${bookingData.passengers?.[0]?.name || 'مسافر'}`
            });
        }
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `عدل بيانات طلب الفيزا رقم: ${bookingData.invoiceNumber || bookingId}`,
            targetId: bookingId
        });
        
        revalidatePath('/visas');
        revalidatePath('/accounts/vouchers/list');

        const doc = await db.collection('visaBookings').doc(bookingId).get();
        const updatedData = { id: doc.id, ...doc.data() } as VisaBookingEntry;
        
        return { success: true, updatedBooking: updatedData };
    } catch (error) {
        console.error("Error updating visa booking: ", String(error));
        return { success: false, error: "Failed to update visa booking." };
    }
}

export async function softDeleteVisaBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user || !('name' in user)) return { success: false, error: "User not authenticated." };

    try {
        const now = new Date().toISOString();
        const deletedBy = user.name || user.uid;

        await db.runTransaction(async (transaction) => {
            const bookingRef = db.collection('visaBookings').doc(bookingId);
            transaction.update(bookingRef, { isDeleted: true, deletedAt: now, deletedBy: deletedBy });
            
            const voucherQuery = db.collection('journal-vouchers')
                .where('sourceId', '==', bookingId)
                .where('sourceType', '==', 'visa');
            
            const voucherSnap = await transaction.get(voucherQuery);
            voucherSnap.forEach(doc => {
                 transaction.update(doc.ref, { isDeleted: true, deletedAt: now, deletedBy: deletedBy });
                 const deletedVoucherRef = db.collection('deleted-vouchers').doc(doc.id);
                 transaction.set(deletedVoucherRef, { ...doc.data(), deletedAt: now, deletedBy: deletedBy });
            });
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف طلب الفيزا (حذف ناعم) رقم: ${bookingId}`,
            targetId: bookingId,
        });

        revalidatePath('/visas');
        revalidatePath('/system/deleted-log');
        return { success: true };
    } catch (error) {
        console.error("Error soft-deleting visa booking: ", String(error));
        return { success: false, error: "Failed to delete visa booking." };
    }
}

export async function restoreVisaBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        const restoredBy = user.name || user.uid;
        const restoredAt = new Date().toISOString();

        await db.runTransaction(async (transaction) => {
            const bookingRef = db.collection('visaBookings').doc(bookingId);
            transaction.update(bookingRef, {
                isDeleted: false,
                deletedAt: FieldValue.delete(),
                deletedBy: FieldValue.delete(),
                restoredAt,
                restoredBy
            });
            
            const voucherQuery = db.collection('journal-vouchers')
                .where('sourceId', '==', bookingId)
                .where('sourceType', '==', 'visa');
            
            const voucherSnap = await transaction.get(voucherQuery);
            voucherSnap.forEach(doc => {
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
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `استعاد طلب الفيزا المحذوف رقم: ${bookingId}`,
            targetId: bookingId
        });

        revalidatePath('/visas');
        revalidatePath('/system/deleted-log');
        return { success: true };
    } catch (error: any) {
        console.error("Error restoring visa booking: ", String(error));
        return { success: false, error: "Failed to restore visa booking." };
    }
}

export async function permanentDeleteVisaBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
     const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        await db.runTransaction(async (transaction) => {
            const bookingRef = db.collection('visaBookings').doc(bookingId);
            transaction.delete(bookingRef);

            const voucherQuery = db.collection('journal-vouchers')
                .where('sourceId', '==', bookingId)
                .where('sourceType', '==', 'visa');
            
            const voucherSnap = await transaction.get(voucherQuery);
            voucherSnap.forEach(doc => transaction.delete(doc.ref));
            
            const deletedVoucherRef = db.collection('deleted-vouchers').where('sourceId', '==', bookingId);
            const deletedVoucherSnap = await transaction.get(deletedVoucherRef);
            deletedVoucherSnap.forEach(doc => transaction.delete(doc.ref));
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف طلب الفيزا بشكل نهائي رقم: ${bookingId}`,
            targetId: bookingId
        });
        
        revalidatePath('/visas/deleted-visas');
        revalidatePath('/system/deleted-log');

        return { success: true };
    } catch (error: any) {
        console.error("Error permanently deleting visa booking: ", String(error));
        return { success: false, error: "Failed to permanently delete visa booking." };
    }
}

export async function getVisaBookingById(id: string): Promise<VisaBookingEntry | null> {
    const db = await getDb();
    if (!db) return null;
    const doc = await db.collection('visaBookings').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as VisaBookingEntry;
}



