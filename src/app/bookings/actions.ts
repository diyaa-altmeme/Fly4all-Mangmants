

'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import { unstable_cache } from 'next/cache';
import type { BookingEntry, Client } from '@/lib/types';
import { recordFinancialTransaction } from "@/lib/finance/financial-transactions";
import { getCurrentUserFromSession } from '@/app/(auth)/actions';
import { FieldValue } from 'firebase-admin/firestore';
import { getNextVoucherNumber } from '@/lib/sequences';

export const getBookings = unstable_cache(async (options: { 
    page?: number, 
    limit?: number, 
    all?: boolean,
    includeDeleted?: boolean 
} = {}) => {

    const { page = 1, limit = 10, all = false, includeDeleted = false } = options;

    const db = await getDb();
    if (!db) {
        console.error("Database not available");
        return { bookings: [], total: 0 };
    }

    try {
        // Base query
        let query: FirebaseFirestore.Query = db.collection('bookings');

        // Filter by deletion status. Using '==' is more efficient than '!='.
        if (!includeDeleted) {
          query = query.where('isDeleted', '==', false);
        }
        
        // Get the total count for pagination before applying limits.
        const allDocsSnapshot = await query.get();
        const total = allDocsSnapshot.size;

        // Apply ordering
        let paginatedQuery = query.orderBy('enteredAt', 'desc');

        // Apply pagination if not fetching all documents
        if (!all) {
            paginatedQuery = paginatedQuery.limit(limit).offset((page - 1) * limit);
        }

        const paginatedSnapshot = await paginatedQuery.get();
        
        const bookings = paginatedSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as BookingEntry));

        return { bookings, total };

    } catch (error) {
        console.error("Error getting bookings: ", String(error));
        // The error message itself contains the link to create the index!
        // We re-throw or return an error state so the UI can handle it.
        throw new Error(`Firestore query failed. A composite index is likely required. Original error: ${String(error)}`);
    }
}, ['get-bookings']);


export async function addBooking(bookingData: any) {
  const user = await getCurrentUserFromSession();
  if (!user || !('role' in user)) throw new Error("User not authenticated.");

  const db = await getDb();
  const bookingRef = db.collection('bookings').doc();
  const clientDoc = await db.collection('clients').doc(bookingData.clientId).get();
  if (!clientDoc.exists) throw new Error("Client not found.");
  const client = clientDoc.data() as Client;

  const totalSale = bookingData.passengers.reduce((acc: number, p: any) => acc + (Number(p.salePrice) || 0), 0);
  const totalPurchase = bookingData.passengers.reduce((acc: number, p: any) => acc + (Number(p.purchasePrice) || 0), 0);
  
  const newInvoiceNumber = await getNextVoucherNumber('BK');

   await bookingRef.set({
       ...bookingData,
       id: bookingRef.id,
       invoiceNumber: newInvoiceNumber,
       enteredBy: user.name,
       enteredAt: new Date().toISOString(),
       isDeleted: false,
   });
   
    await recordFinancialTransaction({
      invoiceNumber: newInvoiceNumber,
      sourceType: "booking",
      sourceId: bookingRef.id,
      date: bookingData.issueDate,
      currency: bookingData.currency,
      amount: totalSale,
      debitAccountId: bookingData.clientId,
      creditAccountId: bookingData.supplierId,
      description: `حجز طيران PNR: ${bookingData.pnr} للعميل ${client.name}`,
      meta: { ...bookingData, bookingId: bookingRef.id },
    }, { actorId: user.uid, actorName: user.name });


  return { success: true, newBooking: { id: bookingRef.id, ...bookingData, invoiceNumber: newInvoiceNumber } };
}

// Keep other functions as they are...
export async function findBookingByRef(ref: string): Promise<BookingEntry[]> { return [] }
export async function updateBooking(id: string, data: any): Promise<{ success: boolean; error?: string, updatedBooking?: BookingEntry}> { return { success: false, error: 'Not implemented' }}
export async function refundBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function exchangeBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function voidBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function addMultipleBookings(bookings: any[]): Promise<{ success: boolean; count: number; error?: string; newBookings?: BookingEntry[]}> { return { success: false, count: 0, error: 'Not implemented' }}

export async function softDeleteBooking(id: string): Promise<{ success: boolean; error?: string}> { 
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    const batch = db.batch();
    const bookingRef = db.collection('bookings').doc(id);
    batch.update(bookingRef, { isDeleted: true, deletedAt: new Date().toISOString() });
    
    // Also mark related journal vouchers as deleted
    const vouchersSnap = await db.collection('journal-vouchers').where('sourceId', '==', id).get();
    vouchersSnap.forEach(doc => {
        batch.update(doc.ref, { isDeleted: true });
    });

    await batch.commit();
    return { success: true };
}

export async function restoreBooking(id: string): Promise<{ success: boolean; error?: string}> { 
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    const batch = db.batch();
    const bookingRef = db.collection('bookings').doc(id);
    batch.update(bookingRef, { isDeleted: false, deletedAt: FieldValue.delete() });
    
    const vouchersSnap = await db.collection('journal-vouchers').where('sourceId', '==', id).get();
    vouchersSnap.forEach(doc => {
        batch.update(doc.ref, { isDeleted: false });
    });
    
    await batch.commit();
    return { success: true };
}

export async function permanentDeleteBooking(id: string): Promise<{ success: boolean; error?: string}> { 
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    const batch = db.batch();
    const bookingRef = db.collection('bookings').doc(id);
    batch.delete(bookingRef);

    const vouchersSnap = await db.collection('journal-vouchers').where('sourceId', '==', id).get();
    vouchersSnap.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
}



