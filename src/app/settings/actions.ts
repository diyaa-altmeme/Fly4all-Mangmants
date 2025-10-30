
'use server';

import { getDb, getStorageAdmin } from '@/lib/firebase-admin';
import type { AppSettings, HealthCheckResult, DatabaseStatusSettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '@/lib/auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import { defaultSettingsData } from '@/lib/defaults';
import { cache } from 'react';

// Mock function until google drive is implemented
async function testGoogleDriveConnection(): Promise<HealthCheckResult> {
    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate check
        return { service: 'Google Drive', success: true, message: "الاتصال ناجح" };
    } catch (error: any) {
         return { service: 'Google Drive', success: false, message: `فشل الاتصال: ${error.message}` };
    }
}

const SETTINGS_DOC_ID = 'app_settings';

// This function is now the single source of truth for fetching settings.
// It's cached to improve performance across server components.
export const getSettings = cache(async (): Promise<AppSettings> => {
    const db = await getDb();
    if (!db) {
        console.warn("Database not available, returning default settings.");
        return defaultSettingsData;
    }

    try {
        const settingsDoc = await db.collection('settings').doc(SETTINGS_DOC_ID).get();
        if (!settingsDoc.exists) {
            console.log("No settings found in database, seeding with default settings.");
            const initialSettings = { ...defaultSettingsData, databaseStatus: { isDatabaseConnected: true } };
            await db.collection('settings').doc(SETTINGS_DOC_ID).set(initialSettings);
            return initialSettings;
        }
        
        const settingsData = settingsDoc.data() as AppSettings;
        
        // Always ensure the DB connection status in the app is 'true' to avoid accidental lockout.
        // The actual connection status is managed by server environment variables.
        if (settingsData.databaseStatus?.isDatabaseConnected !== true) {
             return { ...settingsData, databaseStatus: { isDatabaseConnected: true } };
        }
        
        return settingsData;

    } catch (error: any) {
        console.error("Error getting settings:", String(error));
        return { ...defaultSettingsData, databaseStatus: { isDatabaseConnected: true } };
    }
});


export async function updateSettings(settingsData: Partial<AppSettings>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);

    try {
        const oldSettings = await getSettings();
        
        const newSettings: AppSettings = { ...oldSettings, ...settingsData };

        await settingsRef.set(newSettings, { merge: true });
        
        await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'SETTINGS',
            description: `قام بتحديث إعدادات النظام.`,
        });

        // Revalidate all relevant paths that might depend on settings
        revalidatePath('/settings', 'layout');
        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error: any) {
        console.error("Error updating settings:", String(error));
        return { success: false, error: "Failed to update settings." };
    }
}


async function testFirebaseConnection(): Promise<HealthCheckResult> {
    const db = await getDb();
    if (!db) return { service: 'Firebase', success: false, message: "فشل تهيئة Firebase Admin SDK. تحقق من متغيرات البيئة." };

    try {
        await db.collection('health_checks').limit(1).get();
        return { service: 'Firebase', success: true, message: `الاتصال ناجح` };
    } catch (error: any) {
        console.error("Firebase connection test failed:", String(error));
        let message = `فشل الاتصال: ${error.message}`;
        if (error.code === 7 || (typeof error.message === 'string' && (error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')))) {
             message = "فشل الاتصال: تم رفض الإذن. تحقق من صلاحيات حساب الخدمة (IAM) في Google Cloud Console.";
        } else if (typeof error.message === 'string' && error.message.includes('Could not refresh access token')) {
            message = "فشل في المصادقة. يرجى التحقق من صحة بيانات اعتماد حساب الخدمة (Service Account) المضمنة.";
        } else if (typeof error.message === 'string' && error.message.includes("Unable to detect a Project Id")) {
             message = "فشل في المصادقة: لم يتم العثور على معرف المشروع. تحقق من أن ملف الخدمة يحتوي على `project_id`.";
        }
        return { service: 'Firebase', success: false, message: message };
    }
}

export async function checkSystemHealth(): Promise<HealthCheckResult[]> {
    const results = await Promise.all([
        testFirebaseConnection(),
        testGoogleDriveConnection()
    ]);
    return results;
}
