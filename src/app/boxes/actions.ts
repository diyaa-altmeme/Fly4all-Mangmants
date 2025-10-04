

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { Box } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getSettings } from '@/app/settings/actions';

const BOXES_COLLECTION = 'boxes';

export const getBoxes = cache(async (): Promise<Box[]> => {
    const db = await getDb();
    if (!db) {
        console.warn("Database not available, returning empty boxes list.");
        return [];
    }

    try {
        const snapshot = await db.collection(BOXES_COLLECTION).get();
        if (snapshot.empty) return [];

        const boxes: Box[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                openingBalanceUSD: data.openingBalanceUSD || 0,
                openingBalanceIQD: data.openingBalanceIQD || 0,
            } as Box;
        });
        return boxes;
    } catch (error) {
        console.error("Error getting boxes from Firestore: ", String(error));
        // Return empty array on error to prevent crashing, allowing the rest of the app to function
        return [];
    }
});

export async function addBox(data: Omit<Box, 'id'>): Promise<{ success: boolean; error?: string; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(BOXES_COLLECTION).add(data);
        revalidatePath('/boxes');
        return { success: true };
    } catch (error: any) {
        console.error("Error adding box: ", String(error));
        return { success: false, error: "Failed to add box." };
    }
}

export async function updateBox(id: string, data: Partial<Omit<Box, 'id'>>): Promise<{ success: boolean; error?: string; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(BOXES_COLLECTION).doc(id).update(data);
        revalidatePath('/boxes');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating box: ", String(error));
        return { success: false, error: "Failed to update box." };
    }
}

export async function deleteBox(id: string): Promise<{ success: boolean; error?: string; }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };

    try {
        await db.collection(BOXES_COLLECTION).doc(id).delete();
        revalidatePath('/boxes');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting box: ", String(error));
        return { success: false, error: "Failed to delete box." };
    }
}
