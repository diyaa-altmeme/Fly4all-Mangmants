
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { CompanyGroup } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const GROUPS_COLLECTION = 'company_groups';

export async function saveGroups(groups: CompanyGroup[]): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    try {
        const batch = db.batch();
        const existingDocs = await db.collection(GROUPS_COLLECTION).get();
        
        // Delete groups that are not in the new list
        existingDocs.docs.forEach(doc => {
            if (!groups.some(g => g.id === doc.id)) {
                batch.delete(doc.ref);
            }
        });

        // Add or update groups from the new list
        groups.forEach(group => {
            const docRef = db.collection(GROUPS_COLLECTION).doc(group.id);
            batch.set(docRef, group);
        });

        await batch.commit();
        revalidatePath('/relations/settings');
        return { success: true };
    } catch (e: any) {
        console.error("Error saving groups:", e);
        return { success: false, error: e.message };
    }
}
