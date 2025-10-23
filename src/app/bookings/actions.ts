
'use server';

import { getDb } from '@/lib/firebase-admin';
import { unstable_cache } from 'next/cache';
import type { BookingEntry } from '@/lib/types';

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
        query = query.where('isDeleted', '==', includeDeleted);
        
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
