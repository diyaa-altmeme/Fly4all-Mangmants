

'use server';

import { revalidatePath } from 'next/cache';
import type { SiteAsset } from '@/lib/types';
import { getDb, getStorageAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getSettings, updateSettings } from '../actions';
import { cache } from 'react';

const ASSETS_COLLECTION = 'site_assets';

export const getSiteAssets = cache(async (): Promise<SiteAsset[]> => {
    const db = await getDb();
    if (!db) return [];
    try {
        const snapshot = await db.collection(ASSETS_COLLECTION).orderBy('uploadedAt', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data() as SiteAsset);
    } catch (e) {
        console.error('Error fetching site assets:', e);
        return [];
    }
});

export async function addSiteAsset(assetData: SiteAsset): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };

    try {
        await db.collection(ASSETS_COLLECTION).doc(assetData.id).set(assetData);
        revalidatePath('/settings/assets', 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function permanentDeleteAsset(asset: SiteAsset): Promise<{ success: boolean, error?: string }> {
    const db = await getDb();
    const storage = await getStorageAdmin();
    if (!db || !storage) return { success: false, error: "Database or Storage not available." };

    try {
        // Delete from Storage
        const fileRef = storage.bucket().file(asset.fullPath);
        await fileRef.delete().catch(error => {
            // Ignore object not found error, as we want to proceed to delete from Firestore anyway
            if (error.code !== 404) {
                throw error;
            }
            console.log(`File not found in storage: ${asset.fullPath}, proceeding to delete from Firestore.`);
        });

        // Delete from Firestore
        await db.collection(ASSETS_COLLECTION).doc(asset.id).delete();
        
        revalidatePath('/settings/assets');
        return { success: true };
    } catch(error: any) {
        console.error("Error deleting asset:", String(error));
        return { success: false, error: `Failed to delete asset: ${error.message}` };
    }
}


export async function assignAsset(assetId: string, fullPath: string, assignmentPath: string | null): Promise<{ success: boolean; error?: string }> {
     const db = await getDb();
     if (!db) return { success: false, error: "Database not available." };

     const settingsRef = db.collection('settings').doc('app_settings');
    
    try {
        await db.runTransaction(async (transaction) => {
            const assetQuery = await db.collection(ASSETS_COLLECTION).where('fullPath', '==', fullPath).limit(1).get();
            
            const assetDocRef = !assetQuery.empty ? assetQuery.docs[0].ref : null;
            const asset = !assetQuery.empty ? assetQuery.docs[0].data() as SiteAsset : null;

            // If assigning, first un-assign any other asset from this slot
            if (assignmentPath) {
                const oldAssignmentQuery = await transaction.get(db.collection(ASSETS_COLLECTION).where('assignment', '==', assignmentPath));
                oldAssignmentQuery.forEach(doc => {
                    if (assetDocRef && doc.id !== assetDocRef.id) {
                        transaction.update(doc.ref, { assignment: null });
                    }
                });
            }
            
            // Un-assign the current asset from its old slot if it's being moved or unassigned
            if (asset?.assignment && asset.assignment !== assignmentPath) {
                const oldPath = asset.assignment;
                 transaction.set(settingsRef, { theme: { assets: { [oldPath.split('.').pop()!]: FieldValue.delete() } } }, { merge: true });
            }

            // Set the new assignment on the asset document
            if (assetDocRef) {
                transaction.update(assetDocRef, { assignment: assignmentPath });
            }
            
            // Update the settings document with the new URL or delete it
            const pathParts = assignmentPath ? assignmentPath.split('.') : [];
            if (assignmentPath && asset) {
                const settingToUpdate = pathParts.reduceRight((acc, part, index) => {
                    if (index === pathParts.length - 1) return { [part]: acc };
                    return { [part]: acc };
                }, asset.url as any);

                 transaction.set(settingsRef, settingToUpdate, { merge: true });
            } else if (pathParts.length > 0) {
                 const settingToUpdate = pathParts.reduceRight((acc, part, index) => {
                    if (index === pathParts.length - 1) return { [part]: acc };
                    return { [part]: acc };
                }, FieldValue.delete() as any);
                transaction.set(settingsRef, settingToUpdate, { merge: true });
            }
        });
        
        revalidatePath('/settings/assets', 'layout');
        revalidatePath('/settings', 'layout');
        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error: any) {
        console.error("Error updating asset assignment:", error);
        return { success: false, error: error.message };
    }
}
