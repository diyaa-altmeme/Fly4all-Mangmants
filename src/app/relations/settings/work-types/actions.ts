
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { WorkType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const WORK_TYPES_COLLECTION = 'work_types';

export async function saveWorkTypes(workTypes: WorkType[]): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    try {
        const batch = db.batch();
        const existingDocs = await db.collection(WORK_TYPES_COLLECTION).get();
        
        existingDocs.docs.forEach(doc => {
            if (!workTypes.some(wt => wt.id === doc.id)) {
                batch.delete(doc.ref);
            }
        });
        
        workTypes.forEach(workType => {
            const docRef = db.collection(WORK_TYPES_COLLECTION).doc(workType.id);
            batch.set(docRef, workType);
        });

        await batch.commit();
        revalidatePath('/relations/settings');
        return { success: true };
    } catch (e: any) {
        console.error("Error saving work types:", e);
        return { success: false, error: e.message };
    }
}
