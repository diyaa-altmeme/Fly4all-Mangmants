

'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { SiteAsset } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const ASSETS_COLLECTION = 'site_assets';

const processDoc = (doc: FirebaseFirestore.DocumentSnapshot): any => {
    const data = doc.data() as any;
    if (!data) return null;

    const safeData = { ...data, id: doc.id };
    for (const key in safeData) {
        if (safeData[key] && typeof safeData[key].toDate === 'function') {
            safeData[key] = safeData[key].toDate().toISOString();
        }
    }
    return safeData;
};


export const getSiteAssets = cache(async (): Promise<SiteAsset[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection(ASSETS_COLLECTION).orderBy('uploadedAt', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => processDoc(doc) as SiteAsset);
    } catch (e) {
        console.error('Error fetching site assets:', e);
        return [];
    }
});

// Other functions that required firebase-admin have been moved to server-actions.ts
