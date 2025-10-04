
      
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { BookingEntry, JournalEntry, TicketOperation, TicketOperationType, Passenger, Currency, JournalVoucher } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';
import { format, parseISO } from 'date-fns';
import { cache } from 'react';
import { FieldValue } from 'firebase-admin/firestore';
import { getSettings } from '@/app/settings/actions';
import { getNextVoucherNumber } from '@/lib/sequences';
import { createNotification } from '../notifications/actions';
import { createAuditLog } from '../system/activity-log/actions';

// This function is now the primary source for the unified bookings and operations table.
export const getBookings = cache(async (options: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
} = {}): Promise<{ bookings: JournalVoucher[], total: number }> => {
    const { page = 1, limit = 15, includeDeleted = false } = options;
    const settings = await getSettings();
    if (!settings.databaseStatus?.isDatabaseConnected) {
        console.log("Database connection is disabled in settings. Skipping getBookings fetch.");
        return { bookings: [], total: 0 };
    }

    const db = await getDb();
    if (!db) return { bookings: [], total: 0 };

    try {
        const relevantVoucherTypes = ['booking', 'refund', 'exchange', 'void'];
        
        let query: FirebaseFirestore.Query = db.collection('journal-vouchers')
            .where('voucherType', 'in', relevantVoucherTypes);
        
        const allDocsSnapshot = await query.get();
        
        const allOperations = allDocsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as JournalVoucher))
            .filter(op => {
                // This additional in-code filter handles records where isDeleted might not exist (which evaluates to not true).
                if (includeDeleted) {
                    return op.originalData?.isDeleted === true;
                }
                return op.originalData?.isDeleted !== true;
            });


        // Sort in memory
        allOperations.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        
        const total = allOperations.length;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedOps = allOperations.slice(startIndex, endIndex);

        return { bookings: paginatedOps, total };

    } catch (error) {
        console.error("Error getting unified bookings/operations from journal-vouchers: ", String(error));
        return { bookings: [], total: 0 };
    }
});


export async function addBooking(bookingData: Omit<BookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>): Promise<{ success: boolean; error?: string; newBooking?: BookingEntry }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const batch = db.batch();
    
    try {
        const newInvoiceNumber = await getNextVoucherNumber('BK');
        
        // This is the new primary record. The 'bookings' collection is now for denormalized display data if needed.
        const journalVoucherRef = db.collection('journal-vouchers').doc();
        
        const dataToSave: Omit<BookingEntry, 'id'> = {
            ...bookingData,
            invoiceNumber: newInvoiceNumber,
            pnr: bookingData.pnr || '',
            supplierId: bookingData.supplierId || '',
            clientId: bookingData.clientId || '',
            currency: bookingData.currency || 'USD',
            travelDate: bookingData.travelDate || new Date().toISOString(),
            issueDate: bookingData.issueDate || new Date().toISOString(),
            route: bookingData.route || '',
            passengers: bookingData.passengers.map(p => ({...p, ticketType: p.ticketType || 'Issue'})),
            isEntered: true,
            isAudited: false,
            isDeleted: false,
            enteredBy: user.name,
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        
        const totalSale = dataToSave.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const totalPurchase = dataToSave.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);

        const debitEntries: JournalEntry[] = [
            { accountId: dataToSave.clientId, amount: totalSale, description: `شراء تذكرة PNR: ${dataToSave.pnr}` },
            { accountId: `expense_tickets`, amount: totalPurchase, description: `تكلفة تذكرة PNR: ${dataToSave.pnr}` }
        ];
        
        const creditEntries: JournalEntry[] = [
             { accountId: dataToSave.supplierId, amount: totalPurchase, description: `مستحقات تذكرة PNR: ${dataToSave.pnr}` },
             { accountId: `revenue_tickets`, amount: totalSale, description: `إيرادات تذكرة PNR: ${dataToSave.pnr}` }
        ];

        batch.set(journalVoucherRef, {
            invoiceNumber: newInvoiceNumber,
            date: dataToSave.issueDate,
            currency: dataToSave.currency,
            exchangeRate: null,
            notes: dataToSave.notes || `تسجيل حجز طيران ${dataToSave.pnr}`,
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "booking",
            debitEntries,
            creditEntries,
            isAudited: false,
            isConfirmed: true, // Auto-confirmed
            originalData: { ...dataToSave, bookingId: journalVoucherRef.id, isDeleted: false }, 
        });

        batch.update(db.collection('clients').doc(dataToSave.clientId), { useCount: FieldValue.increment(1) });
        batch.update(db.collection('clients').doc(dataToSave.supplierId), { useCount: FieldValue.increment(1) });
        if (dataToSave.boxId) {
            batch.update(db.collection('boxes').doc(dataToSave.boxId), { useCount: FieldValue.increment(1) });
        }


        dataToSave.passengers.forEach(p => {
            if (p.salePrice < p.purchasePrice) {
                 createNotification({
                    userId: user.uid,
                    title: 'تحذير: ربح سالب',
                    body: `تم تسجيل تذكرة للراكب ${p.name} (PNR: ${dataToSave.pnr}) بسعر بيع أقل من سعر الشراء.`,
                    type: 'warning',
                    link: `/bookings`
                });
            }
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'BOOKING',
            description: `أنشأ حجزًا جديدًا برقم PNR: ${dataToSave.pnr}`,
        });


        await batch.commit();

        revalidatePath('/bookings');
        revalidatePath('/accounts/vouchers/list');

        const newBooking: BookingEntry = { id: journalVoucherRef.id, ...dataToSave };
        return { success: true, newBooking };
    } catch (error) {
        console.error("Error adding booking: ", String(error));
        return { success: false, error: "Failed to add booking." };
    }
}


export async function addMultipleBookings(bookingsData: Omit<BookingEntry, 'id' | 'invoiceNumber' | 'enteredBy' | 'enteredAt' | 'isEntered' | 'isAudited' | 'isDeleted'>[]): Promise<{ success: boolean; count: number; error?: string; newBookings?: BookingEntry[] }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, count: 0, error: "User not authenticated." };
    
    const db = await getDb();
    if (!db) return { success: false, count: 0, error: "Database not available." };

    let createdCount = 0;
    const allAddedOrUpdatedBookings: BookingEntry[] = [];
    
    for (const bookingData of bookingsData) {
        try {
            const newInvoiceNumber = await getNextVoucherNumber('BK');
            const journalVoucherRef = db.collection('journal-vouchers').doc();
            
            const dataToSave: Omit<BookingEntry, 'id'> = {
                ...bookingData,
                invoiceNumber: newInvoiceNumber,
                enteredBy: user.name,
                enteredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isEntered: true,
                isAudited: false,
                isDeleted: false,
            };

            const totalSale = dataToSave.passengers.reduce((sum, p) => sum + p.salePrice, 0);
            const totalPurchase = dataToSave.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);

            const debitEntries: JournalEntry[] = [
                { accountId: dataToSave.clientId, amount: totalSale, description: `شراء تذكرة PNR: ${dataToSave.pnr}` },
                { accountId: 'expense_tickets', amount: totalPurchase, description: `تكلفة تذكرة PNR: ${dataToSave.pnr}` }
            ];
            const creditEntries: JournalEntry[] = [
                { accountId: dataToSave.supplierId, amount: totalPurchase, description: `مستحقات تذكرة PNR: ${dataToSave.pnr}` },
                { accountId: 'revenue_tickets', amount: totalSale, description: `إيرادات تذكرة PNR: ${dataToSave.pnr}` }
            ];

            await journalVoucherRef.set({
                invoiceNumber: newInvoiceNumber,
                date: dataToSave.issueDate,
                currency: dataToSave.currency,
                exchangeRate: null,
                notes: dataToSave.notes || `تسجيل حجز طيران ${dataToSave.pnr}`,
                createdBy: user.uid,
                officer: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                voucherType: "booking",
                debitEntries, creditEntries, isAudited: false, isConfirmed: true,
                originalData: { ...dataToSave, isNewBooking: true, isDeleted: false }, 
            });

            createdCount++;
            allAddedOrUpdatedBookings.push({ id: `temp-${journalVoucherRef.id}`, ...dataToSave });
        } catch (error) {
             console.error(`Error processing transaction for PNR ${bookingData.pnr}:`, error);
        }
    }


    if (allAddedOrUpdatedBookings.length > 0) {
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'CREATE',
            targetType: 'BOOKING',
            description: `أضاف ${allAddedOrUpdatedBookings.length} حجوزات جديدة بشكل جماعي.`,
        });

        revalidatePath('/bookings');
    }

    return { success: true, count: createdCount, newBookings: allAddedOrUpdatedBookings };
}


export async function updateBooking(bookingId: string, bookingData: Partial<Omit<BookingEntry, 'id'>>): Promise<{ success: boolean; error?: string; updatedBooking?: BookingEntry }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        const journalVoucherRef = db.collection('journal-vouchers').doc(bookingId);
        const originalDoc = await journalVoucherRef.get();
        if (!originalDoc.exists) {
            throw new Error("Booking record not found in journal.");
        }
        
        const originalJournalData = originalDoc.data() as JournalVoucher;
        
        // Merge new data with existing originalData
        const dataToUpdate: BookingEntry = { 
            ...(originalJournalData.originalData as BookingEntry),
            ...bookingData, 
            updatedAt: new Date().toISOString() 
        };
        
        if ('id' in dataToUpdate) {
            delete (dataToUpdate as any).id;
        }
        
        if (dataToUpdate.passengers) {
            dataToUpdate.passengers = dataToUpdate.passengers.map(p => ({...p}));
        }

        const totalSale = dataToUpdate.passengers!.reduce((sum, p) => sum + p.salePrice, 0);
        const totalPurchase = dataToUpdate.passengers!.reduce((sum, p) => sum + p.purchasePrice, 0);
        
        const debitEntries: JournalEntry[] = [
            { accountId: dataToUpdate.clientId!, amount: totalSale, description: `شراء تذكرة PNR: ${dataToUpdate.pnr}` },
            { accountId: 'expense_tickets', amount: totalPurchase, description: `تكلفة تذكرة PNR: ${dataToUpdate.pnr}` }
        ];
        
        const creditEntries: JournalEntry[] = [
             { accountId: dataToUpdate.supplierId!, amount: totalPurchase, description: `مستحقات تذكرة PNR: ${dataToUpdate.pnr}` },
             { accountId: 'revenue_tickets', amount: totalSale, description: `إيرادات تذكرة PNR: ${dataToUpdate.pnr}` }
        ];
        
        await journalVoucherRef.update({
            'originalData': dataToUpdate,
            'debitEntries': debitEntries,
            'creditEntries': creditEntries,
            'notes': dataToUpdate.notes,
            'date': dataToUpdate.issueDate,
            'updatedAt': new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `عدل بيانات الحجز برقم PNR: ${bookingData.pnr || bookingId}`,
        });
        
        revalidatePath('/bookings');
        revalidatePath('/accounts/vouchers/list');

        const doc = await journalVoucherRef.get();
        const updatedData = { id: doc.id, ...doc.data()?.originalData } as BookingEntry;
        
        return { success: true, updatedBooking: updatedData };
    } catch (error) {
        console.error("Error updating booking: ", String(error));
        return { success: false, error: "Failed to update booking." };
    }
}

export async function softDeleteBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const bookingRef = db.collection('journal-vouchers').doc(bookingId);
    
    try {
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
            throw new Error("Booking not found");
        }
        const pnr = bookingDoc.data()?.originalData?.pnr || bookingId;

        await bookingRef.update({
            'originalData.isDeleted': true,
            'originalData.deletedAt': new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف الحجز (حذف ناعم) برقم PNR: ${pnr}`,
        });
        
        revalidatePath('/bookings');
        revalidatePath('/bookings/deleted-bookings');
        return { success: true };
    } catch (error) {
        console.error("Error soft-deleting booking: ", String(error));
        return { success: false, error: "Failed to soft-delete booking." };
    }
}


export async function restoreBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    try {
        await db.collection('journal-vouchers').doc(bookingId).update({
            'originalData.isDeleted': false,
            'originalData.deletedAt': FieldValue.delete(),
        });

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'BOOKING',
            description: `استعاد الحجز المحذوف رقم: ${bookingId}`,
        });

        revalidatePath('/bookings');
        revalidatePath('/bookings/deleted-bookings');
        return { success: true };
    } catch (error) {
        console.error("Error restoring booking: ", String(error));
        return { success: false, error: "Failed to restore booking." };
    }
}

export async function permanentDeleteBooking(bookingId: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };

    const batch = db.batch();
    
    try {
        const bookingRef = db.collection('journal-vouchers').doc(bookingId);
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
             throw new Error("Booking not found");
        }
        const pnr = bookingDoc.data()?.originalData?.pnr || bookingId;
        
        batch.delete(bookingRef);
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `حذف الحجز نهائيًا برقم PNR: ${pnr}`,
        });
        
        revalidatePath('/bookings');
        revalidatePath('/bookings/deleted-bookings');
        revalidatePath('/accounts/vouchers/list');
        return { success: true };
    } catch (error) {
        console.error("Error permanently deleting booking: ", String(error));
        return { success: false, error: "Failed to permanently delete booking." };
    }
}


export async function markAsEntered(bookingId: string) {
    const user = await getCurrentUserFromSession();
     if (!user) return { success: false, error: "User not authenticated." };
    
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const docRef = db.collection('bookings').doc(bookingId);
        await docRef.update({
            isEntered: true,
            enteredBy: user.name,
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'APPROVE',
            targetType: 'BOOKING',
            description: `أكد إدخال الحجز (ID: ${bookingId})`,
        });

        const updatedDoc = await docRef.get();
        const updatedBooking = { id: updatedDoc.id, ...updatedDoc.data() } as BookingEntry;
        revalidatePath('/bookings');
        return { success: true, updatedBooking };
    } catch (error) {
         return { success: false, error: "Failed to mark as entered." };
    }
}

export async function markAsAudited(bookingId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };
    
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const docRef = db.collection('bookings').doc(bookingId);
        const doc = await docRef.get();
        if (doc.exists && doc.data()?.enteredBy === user.name) {
            return { success: false, error: "لا يمكنك تدقيق إدخال قمت به بنفسك." };
        }

        await docRef.update({
            isAudited: true,
            auditedBy: user.name,
            auditedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'APPROVE',
            targetType: 'BOOKING',
            description: `دقق الحجز (ID: ${bookingId})`,
        });
         
        const updatedDoc = await docRef.get();
        const updatedBooking = { id: updatedDoc.id, ...updatedDoc.data() } as BookingEntry;
        revalidatePath('/bookings');
        return { success: true, updatedBooking };
    } catch (error) {
         return { success: false, error: "Failed to mark as audited." };
    }
}

export async function findBookingByRef(ref: string): Promise<BookingEntry[] | null> {
    const db = await getDb();
    if (!db) return null;

    let bookings: BookingEntry[] = [];
    
    const pnrQuery = db.collection('journal-vouchers')
        .where('voucherType', '==', 'booking')
        .where('originalData.pnr', '==', ref.toUpperCase());
        
    const pnrSnapshot = await pnrQuery.get();
    
    pnrSnapshot.forEach(doc => {
        const data = doc.data().originalData as Omit<BookingEntry, 'id'>;
        if (doc.data().originalData.isDeleted !== true) {
             bookings.push({ 
                id: doc.id, 
                ...data,
                enteredAt: data.enteredAt,
                issueDate: data.issueDate,
            });
        }
    });

    if (bookings.length > 0) return bookings;

    const allBookingsSnapshot = await db.collection('journal-vouchers')
      .where('voucherType', '==', 'booking')
      .get();
      
    allBookingsSnapshot.forEach(doc => {
        const booking = doc.data().originalData as BookingEntry;
        if (booking.isDeleted !== true && booking.passengers && booking.passengers.some(p => p.ticketNumber === ref)) {
            if (!bookings.some(b => b.id === doc.id)) {
                bookings.push({ id: doc.id, ...booking });
            }
        }
    });

    return bookings.length > 0 ? bookings : null;
}


async function recordTicketOperation(operation: Omit<TicketOperation, 'id' | 'createdAt' | 'createdBy'>): Promise<string> {
    const db = await getDb();
    const user = await getCurrentUserFromSession();
    if (!db || !user) throw new Error("Authentication or database error.");
    
    const docRef = db.collection('ticket_operations').doc();
    await docRef.set({
        ...operation,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        createdBy: user.name,
    });
    return docRef.id;
}


export async function refundBooking(
    booking: BookingEntry, 
    refundData: { passengers: Passenger[], airlineFee: number; officeFee: number; notes: string; currency: Currency },
    isExternal: boolean = false
): Promise<{ success: boolean; error?: string }> {
     const user = await getCurrentUserFromSession();
     if (!user) return { success: false, error: "User not authenticated." };
     const db = await getDb();
     if (!db) return { success: false, error: "Database not available." };

    try {
        const batch = db.batch();
        
        const totalSaleOfRefunded = refundData.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const totalCostOfRefunded = refundData.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);
        
        const amountToReturnToClient = totalSaleOfRefunded - refundData.airlineFee - refundData.officeFee;
        const amountToBeReturnedBySupplier = totalCostOfRefunded - refundData.airlineFee;

        const journalVoucherRef = db.collection('journal-vouchers').doc();
        const invoiceNumber = await getNextVoucherNumber('RF');
        
        const debitEntries: JournalEntry[] = [
          { accountId: booking.supplierId, amount: amountToBeReturnedBySupplier, description: `استحقاق استرجاع من مورد لـ ${booking.pnr}` },
          { accountId: 'revenue_tickets', amount: totalSaleOfRefunded, description: `عكس إيراد تذاكر مسترجعة لـ ${booking.pnr}` },
        ];

        const creditEntries: JournalEntry[] = [
          { accountId: booking.clientId, amount: amountToReturnToClient, description: `مبلغ مسترجع للعميل عن تذكرة ${booking.pnr}` },
          { accountId: 'expense_tickets', amount: totalCostOfRefunded, description: `عكس تكلفة تذاكر مسترجعة لـ ${booking.pnr}` },
          { accountId: 'revenue_fees', amount: refundData.officeFee, description: `رسوم استرجاع المكتب لـ ${booking.pnr}` },
        ];
        
        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: new Date().toISOString(),
            currency: refundData.currency,
            notes: refundData.notes || `استرجاع الحجز ${booking.pnr}`,
            createdBy: user.uid, officer: user.name, createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "refund", debitEntries, creditEntries,
            isAudited: true, isConfirmed: true,
            originalData: { ...refundData, bookingId: booking.id, pnr: booking.pnr, isExternal, clientId: booking.clientId, supplierId: booking.supplierId, isDeleted: false },
        });

        await batch.commit();

        await createAuditLog({
            userId: user.uid, userName: user.name, action: 'UPDATE', targetType: 'BOOKING',
            description: `أجرى عملية استرجاع لـ ${refundData.passengers.length} مسافرين في الحجز ${booking.pnr}.`,
        });
        
        revalidatePath('/bookings');
        revalidatePath('/accounts/vouchers/list');

        return { success: true };
    } catch(error: any) {
        console.error("Error creating refund transaction:", String(error));
        return { success: false, error: "Failed to process refund transaction." };
    }
}

export async function exchangeBooking(
    booking: BookingEntry, 
    exchangeData: { 
        passengers: Passenger[],
        newPnr: string; 
        airlineFee: number; 
        officeFee: number; 
        priceDifference: number; 
        notes: string;
        currency: Currency;
    },
    isExternal: boolean = false
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        const batch = db.batch();

        const totalFees = exchangeData.airlineFee + exchangeData.officeFee;
        const amountToChargeClient = totalFees + exchangeData.priceDifference;

        const journalVoucherRef = db.collection('journal-vouchers').doc();
        const invoiceNumber = await getNextVoucherNumber('EXC');
        
        const debitEntries: JournalEntry[] = [
            { accountId: booking.clientId, amount: amountToChargeClient, description: `تكلفة تغيير حجز ${booking.pnr}` },
        ];
        
        const creditEntries: JournalEntry[] = [
            { accountId: booking.supplierId, amount: exchangeData.airlineFee + exchangeData.priceDifference, description: `رسوم تغيير + فرق سعر لـ ${booking.pnr}` },
            { accountId: 'revenue_fees', amount: exchangeData.officeFee, description: `رسوم تغيير المكتب لـ ${booking.pnr}` },
        ];
        
        batch.set(journalVoucherRef, {
            invoiceNumber,
            date: new Date().toISOString(),
            currency: exchangeData.currency,
            notes: exchangeData.notes || `تغيير الحجز ${booking.pnr} إلى ${exchangeData.newPnr}`,
            createdBy: user.uid, officer: user.name, createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: "exchange", debitEntries, creditEntries,
            isAudited: true, isConfirmed: true,
            originalData: { ...exchangeData, bookingId: booking.id, pnr: booking.pnr, isExternal, clientId: booking.clientId, supplierId: booking.supplierId, isDeleted: false },
        });
        
        await batch.commit();

        await createAuditLog({
            userId: user.uid, userName: user.name, action: 'UPDATE', targetType: 'BOOKING',
            description: `أجرى عملية تغيير للحجز ${booking.pnr}.`,
        });
        
        revalidatePath('/bookings');
        revalidatePath('/accounts/vouchers/list');

        return { success: true };
    } catch(error: any) {
        console.error("Error creating exchange transaction:", String(error));
        return { success: false, error: "Failed to process exchange transaction." };
    }
}

export async function voidBooking(
    booking: BookingEntry, 
    voidData: { passengers: Passenger[], supplierPenalty: number; clientPenalty: number; notes: string; currency: Currency },
    isExternal: boolean = false
): Promise<{ success: boolean; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "User not authenticated." };
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    const batch = db.batch();
    
    try {
        const totalSale = voidData.passengers.reduce((sum, p) => sum + p.salePrice, 0);
        const totalCost = voidData.passengers.reduce((sum, p) => sum + p.purchasePrice, 0);

        const voidVoucherRef = db.collection('journal-vouchers').doc();
        const voidInvoiceNumber = await getNextVoucherNumber('VOID');

        // Reverse original entries and add penalties
        const debitEntries: JournalEntry[] = [
             { accountId: 'revenue_tickets', amount: totalSale, description: `عكس إيراد تذكرة ملغاة (فويد) لـ ${booking.pnr}` },
             { accountId: booking.supplierId, amount: totalCost, description: `عكس مستحقات تذكرة ملغاة (فويد) لـ ${booking.pnr}` },
             { accountId: booking.clientId, amount: voidData.clientPenalty, description: `تسجيل غرامة فويد على العميل` },
        ];
        
        const creditEntries: JournalEntry[] = [
            { accountId: 'expense_tickets', amount: totalCost, description: `عكس تكلفة تذكرة ملغاة (فويد) لـ ${booking.pnr}` },
            { accountId: booking.clientId, amount: totalSale, description: `عكس فاتورة تذكرة ملغاة (فويد) لـ ${booking.pnr}` },
             { accountId: booking.supplierId, amount: voidData.supplierPenalty, description: `تسجيل غرامة فويد من المورد` },
        ];


        batch.set(voidVoucherRef, {
            invoiceNumber: voidInvoiceNumber,
            date: new Date().toISOString(),
            currency: voidData.currency,
            notes: `إلغاء (فويد) للحجز ${booking.pnr}. ${voidData.notes || ''}`.trim(),
            createdBy: user.uid,
            officer: user.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            voucherType: 'void',
            debitEntries,
            creditEntries,
            isAudited: true,
            isConfirmed: true,
            originalData: { ...booking, ...voidData, isExternal, clientId: booking.clientId, supplierId: booking.supplierId, isDeleted: false },
        });

        await batch.commit();

        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'DELETE',
            targetType: 'BOOKING',
            description: `قام بإلغاء (فويد) الحجز ${isExternal ? `(خارجي) ${booking.id}` : `(داخلي) لـ PNR: ${booking.pnr}`}.`,
        });

        revalidatePath('/bookings');
        revalidatePath('/accounts/vouchers/list');

        return { success: true };
    } catch (error: any) {
        console.error("Error voiding booking:", error);
        return { success: false, error: error.message || "Failed to void booking." };
    }
}
    