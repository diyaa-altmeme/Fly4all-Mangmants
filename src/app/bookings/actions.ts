

'use server';

import { getDb } from '@/lib/firebase-admin';
import { unstable_cache } from 'next/cache';
import type { BookingEntry } from '@/lib/types';
import { postRevenue, postCost } from "@/lib/finance/posting";
import { getCurrentUserFromSession } from '@/lib/auth/actions';

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
  if (!user) throw new Error("User not authenticated.");

  const totalSale = bookingData.passengers.reduce((acc: number, p: any) => acc + (Number(p.salePrice) || 0), 0);
  const totalPurchase = bookingData.passengers.reduce((acc: number, p: any) => acc + (Number(p.purchasePrice) || 0), 0);
  const totalProfit = totalSale - totalPurchase;
  
   const db = await getDb();
   const bookingRef = db.collection('bookings').doc();

   await bookingRef.set({
       ...bookingData,
       id: bookingRef.id,
       enteredBy: user.name,
       enteredAt: new Date().toISOString(),
   });

   await postRevenue({
      sourceType: "tickets",
      sourceId: bookingRef.id,
      date: bookingData.issueDate,
      currency: bookingData.currency,
      amount: totalProfit,
      clientId: bookingData.clientId
    });

    if (totalPurchase > 0) {
      await postCost({
        costKey: "cost_tickets",
        sourceType: "tickets",
        sourceId: bookingRef.id,
        date: bookingData.issueDate,
        currency: bookingData.currency,
        amount: totalPurchase,
        supplierId: bookingData.supplierId
      });
    }


  return { success: true, newBooking: { id: bookingRef.id, ...bookingData } };
}

// Keep other functions as they are...
export async function findBookingByRef(ref: string): Promise<BookingEntry[]> { return [] }
export async function updateBooking(id: string, data: any): Promise<{ success: boolean; error?: string, updatedBooking?: BookingEntry}> { return { success: false, error: 'Not implemented' }}
export async function refundBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function exchangeBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function voidBooking(booking: BookingEntry, data: any, isNew: boolean): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function addMultipleBookings(bookings: any[]): Promise<{ success: boolean; count: number; error?: string; newBookings?: BookingEntry[]}> { return { success: false, count: 0, error: 'Not implemented' }}
export async function softDeleteBooking(id: string): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function restoreBooking(id: string): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
export async function permanentDeleteBooking(id: string): Promise<{ success: boolean; error?: string}> { return { success: false, error: 'Not implemented' }}
