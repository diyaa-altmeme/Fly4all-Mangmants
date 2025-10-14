
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { SegmentEntry, SegmentSettings, PartnerShareSetting } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const SEGMENTS_COLLECTION = 'segments';

export async function getSegments(): Promise<SegmentEntry[]> {
    try {
        const db = await getDb();
        if (!db) return [];
        const snapshot = await db.collection(SEGMENTS_COLLECTION).orderBy('toDate', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SegmentEntry));
    } catch (error) {
        console.error("Error getting segments from Firestore: ", String(error));
        // Return empty array on error to prevent crashing the page
        return [];
    }
}

export async function addSegmentEntries(entries: Omit<SegmentEntry, 'id'>[]) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const batch = db.batch();
    try {
        entries.forEach(entryData => {
            const docRef = db.collection(SEGMENTS_COLLECTION).doc();
            batch.set(docRef, entryData);
        });
        await batch.commit();

        revalidatePath('/segments');
        return { success: true, count: entries.length };
    } catch (error) {
        console.error("Error adding segment entries: ", String(error));
        return { success: false, error: "Failed to add segment entries." };
    }
}

export async function updateSegmentEntry(id: string, data: Partial<Omit<SegmentEntry, 'id'>>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).update(data);
        revalidatePath('/segments');
        return { success: true };
    } catch (error) {
        console.error("Error updating segment entry: ", String(error));
        return { success: false, error: "Failed to update segment entry." };
    }
}

export async function deleteSegmentEntry(id: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        await db.collection(SEGMENTS_COLLECTION).doc(id).delete();
        revalidatePath('/segments');
        return { success: true };
    } catch (error) {
        console.error("Error deleting segment entry: ", String(error));
        return { success: false, error: "Failed to delete segment entry." };
    }
}

export async function deleteSegmentPeriod(fromDate: string, toDate: string) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    try {
        const snapshot = await db.collection(SEGMENTS_COLLECTION)
            .where('fromDate', '==', fromDate)
            .where('toDate', '==', toDate)
            .get();
        
        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        revalidatePath('/segments');
        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Error deleting segment period: ", String(error));
        return { success: false, error: "Failed to delete segment period." };
    }
}
