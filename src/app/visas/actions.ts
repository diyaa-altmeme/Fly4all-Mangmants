
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { VisaBookingEntry, JournalEntry, VisaPassenger } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';
import { format, parseISO } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';
import { getSettings } from '@/app/settings/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createAuditLog } from '../system/activity-log/actions';

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
        
        if (!includeDeleted) {
            query = query.where('isDeleted', '==', false);
        } else {
            query = query.where('isDeleted', '==', true);
        }

        const snapshot = await query.orderBy('submissionDate', 'desc').get();
        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                isDeleted: data.isDeleted || false,
                passengers: data.passengers || [],
            } as VisaBookingEntry;
        });
    } catch (error) {
        console.error("Error getting visa bookings from Firestore: ", String(error));
        return [];
    }
}


export async function addVisaBooking(bookingData: Omit<VisaBookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>): Promise<{ success: boolean; error?: string; newBooking?: VisaBookingEntry }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const batch = db.batch();

    try {
        const newInvoiceNumber = await getNextVoucherNumber('VS');
        const bookingRef = db.collection('visaBookings').doc();

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
        batch.set(bookingRef, dataToSave);
        
        // Create Journal Entry
        const journalVoucherRef = db.collection('journal-vouchers').doc();
        const totalSale = dataToSave.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const totalPurchase = dataToSave.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);

        const debitEntries: JournalEntry[] = [
            { accountId: dataToSave.clientId, amount: totalSale, description: `شراء فيزا فاتورة ${newInvoiceNumber}` },
            { accountId: 'expense_visa', amount: totalPurchase, description: `تكلفة فيزا فاتورة ${newInvoiceNumber}` }
        ];
        
        const creditEntries: JournalEntry[] = [
             { accountId: dataToSave.supplierId, amount: totalPurchase, description: `مستحقات فيزا فاتورة ${newInvoiceNumber}` },
             { accountId: 'revenue_visa', amount: totalSale, description: `إيراد فيزا فاتورة ${newInvoiceNumber}` }
        ];

        batch.set(journalVoucherRef, {
            invoiceNumber: newInvoiceNumber,
            date: dataToSave.submissionDate,
            currency: dataToSave.currency,
            exchangeRate: null,
            notes: dataToSave.notes || `تسجيل طلب فيزا ${newInvoiceNumber}`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "visa",
            debitEntries,
            creditEntries,
            isAudited: false,
            isConfirmed: true,
            originalData: { ...dataToSave, visaBookingId: bookingRef.id }, 
        });

        // Increment use count for client and supplier
        batch.update(db.collection('clients').doc(dataToSave.clientId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('clients').doc(dataToSave.supplierId), { useCount: FieldValue.increment(1) });
        if(dataToSave.boxId) {
             batch.update(db.collection('boxes').doc(dataToSave.boxId), { useCount: FieldValue.increment(1) });
        }
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'BOOKING',
            description: `أنشأ طلب فيزا جديدًا برقم فاتورة: ${newInvoiceNumber}`,
        });


        await batch.commit();
        
        revalidatePath('/visas');
        revalidatePath('/accounts/vouchers/list');

        const newBooking: VisaBookingEntry = { id: bookingRef.id, ...dataToSave };
        return { success: true, newBooking };
    } catch (error) {
        console.error("Error adding visa booking: ", String(error));
        return { success: false, error: "Failed to add visa booking." };
    }
}


export async function addMultipleVisaBookings(bookingsData: Omit<VisaBookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>[]): Promise<{ success: boolean; count: number; error?: string; newBookings?: VisaBookingEntry[] }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, count: 0, error: "User not authenticated." };
    
    const db = await getDb();
    if (!db) return { success: false, count: 0, error: "Database not available." };

    const batch = db.batch();
    const createdBookings: VisaBookingEntry[] = [];
    const invoiceNumbers: string[] = [];

    for (const bookingData of bookingsData) {
        const newInvoiceNumber = await getNextVoucherNumber('VS');
        const bookingRef = db.collection('visaBookings').doc();
        
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
        batch.set(bookingRef, dataToSave);

        const journalVoucherRef = db.collection('journal-vouchers').doc();
        const totalSale = dataToSave.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const totalPurchase = dataToSave.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
        
        const debitEntries: JournalEntry[] = [
            { accountId: dataToSave.clientId, amount: totalSale, description: `شراء فيزا فاتورة ${newInvoiceNumber}` },
            { accountId: 'expense_visa', amount: totalPurchase, description: `تكلفة فيزا فاتورة ${newInvoiceNumber}` }
        ];
        const creditEntries: JournalEntry[] = [
             { accountId: dataToSave.supplierId, amount: totalPurchase, description: `مستحقات فيزا فاتورة ${newInvoiceNumber}` },
             { accountId: 'revenue_visa', amount: totalSale, description: `إيراد فيزا فاتورة ${newInvoiceNumber}` }
        ];

        batch.set(journalVoucherRef, {
            invoiceNumber: newInvoiceNumber,
            date: dataToSave.submissionDate,
            currency: dataToSave.currency,
            exchangeRate: null,
            notes: dataToSave.notes || `تسجيل طلب فيزا ${newInvoiceNumber}`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "visa",
            debitEntries, creditEntries, isAudited: false, isConfirmed: true,
            originalData: { ...dataToSave, visaBookingId: bookingRef.id }, 
        });

        batch.update(db.collection('clients').doc(dataToSave.clientId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('clients').doc(dataToSave.supplierId), { useCount: FieldValue.increment(1) });
        if (dataToSave.boxId) {
            batch.update(db.collection('boxes').doc(dataToSave.boxId), { useCount: FieldValue.increment(1) });
        }
        
        createdBookings.push({ id: bookingRef.id, ...dataToSave });
        invoiceNumbers.push(newInvoiceNumber);
    }

    try {
        await batch.commit();

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
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `عدل بيانات طلب الفيزا رقم: ${bookingData.invoiceNumber || bookingId}`,
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
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        await db.collection('visaBookings').doc(bookingId).update({
            isDeleted: true,
            deletedAt: new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف طلب الفيزا (حذف ناعم) رقم: ${bookingId}`,
        });

        revalidatePath('/visas');
        revalidatePath('/visas/deleted-visas');
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
        await db.collection('visaBookings').doc(bookingId).update({
            isDeleted: false,
            deletedAt: FieldValue.delete(),
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `استعاد طلب الفيزا المحذوف رقم: ${bookingId}`,
        });

        revalidatePath('/visas');
        revalidatePath('/visas/deleted-visas');
        return { success: true };
    } catch (error) {
        console.error("Error restoring visa booking: ", String(error));
        return { success: false, error: "Failed to restore visa booking." };
    }
}

export async function permanentDeleteVisaBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
     const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const batch = db.batch();

    try {
        // Also delete the journal entry
        const voucherQuery = await db.collection('journal-vouchers')
            .where('originalData.visaBookingId', '==', bookingId)
            .limit(1)
            .get();
        
        if (!voucherQuery.empty) {
            const voucherDoc = voucherQuery.docs[0];
            batch.delete(voucherDoc.ref);
        }

        batch.delete(db.collection('visaBookings').doc(bookingId));
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف طلب الفيزا بشكل نهائي رقم: ${bookingId}`,
        });

        revalidatePath('/visas/deleted-visas');
        return { success: true };
    } catch (error: any) {
        console.error("Error permanently deleting visa booking: ", String(error));
        return { success: false, error: "Failed to permanently delete visa booking." };
    }
}
