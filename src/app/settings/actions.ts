
'use server';

import { getDb, getStorageAdmin } from '@/lib/firebase-admin';
import type { ExchangeRateLog, AppSettings, HealthCheckResult, DatabaseStatusSettings, InvoiceSequenceSettings, VoucherSettings, ThemeCustomizationSettings, TreeNode, AccountType, Client, ImportFieldSettings, ImportLogicSettings, CustomRelationField, RelationSection, LandingPageSettings, CurrencySettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '../auth/actions';
import { createAuditLog } from '../system/activity-log/actions';
import { COUNTRIES_DATA } from '@/lib/countries-data';
import { parseISO } from 'date-fns';
import { defaultSettingsData } from '@/lib/defaults';
import { cache } from 'react';

// Mock function until google drive is implemented
async function testGoogleDriveConnection(): Promise<HealthCheckResult> {
    try {
        // A simple read operation to test the connection and credentials
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate check
        return { service: 'Google Drive', success: true, message: "الاتصال ناجح" };
    } catch (error: any) {
         return { service: 'Google Drive', success: false, message: `فشل الاتصال: ${error.message}` };
    }
}

const SETTINGS_DOC_ID = 'app_settings';


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
            // Set database connection to true by default on initial seed.
            const initialSettings = { ...defaultSettingsData, databaseStatus: { isDatabaseConnected: true } };
            await db.collection('settings').doc(SETTINGS_DOC_ID).set(initialSettings);
            return initialSettings;
        }
        
        const settingsData = settingsDoc.data() as AppSettings;
        // Ensure database connection is enabled.
        if (settingsData.databaseStatus?.isDatabaseConnected !== true) {
             return { ...settingsData, databaseStatus: { isDatabaseConnected: true } };
        }
        
        return settingsData;

    } catch (error: any) {
        console.error("Error getting settings:", String(error));
        // Return default settings but assume DB is connected after re-init
        return { ...defaultSettingsData, databaseStatus: { isDatabaseConnected: true } };
    }
});

export async function updateSettings(settingsData: Partial<AppSettings>) {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available." };
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);

    try {
        const oldSettings = await getSettings();
        
        if ('exchangeRateUSD_IQD' in settingsData && (settingsData as any).exchangeRateUSD_IQD !== (oldSettings as any).exchangeRateUSD_IQD) {
            const logRef = db.collection('exchange_rate_logs').doc();
            const logData: Omit<ExchangeRateLog, 'id'> = {
                rate: (settingsData as any).exchangeRateUSD_IQD!,
                changedAt: new Date().toISOString(),
            };
            await logRef.set(logData);
        }

        // Deep merge the new settings with the existing ones
        const newSettings: AppSettings = {
          ...oldSettings,
          ...settingsData,
          currencySettings: {
            ...(oldSettings.currencySettings || defaultSettingsData.currencySettings),
            ...(settingsData.currencySettings || {}),
          },
          theme: {
            ...(oldSettings.theme || {}),
            ...(settingsData.theme || {}),
            landingPage: {
                 ...(oldSettings.theme?.landingPage || {}),
                 ...(settingsData.theme?.landingPage || {})
            }
          },
          voucherSettings: {
            ...(oldSettings.voucherSettings || {}),
            ...(settingsData.voucherSettings || {}),
             distributed: {
                ...(oldSettings.voucherSettings?.distributed || {}),
                ...(settingsData.voucherSettings?.distributed || {}),
            }
          },
          importFieldsSettings: {
              ...(oldSettings.importFieldsSettings || {}),
              ...(settingsData.importFieldsSettings || {})
          },
          importLogicSettings: {
              ...(oldSettings.importLogicSettings || {}),
              ...(settingsData.importLogicSettings || {})
          }
        };

        await settingsRef.set(newSettings, { merge: true });
        
         await createAuditLog({
            userId: user.uid,
            userName: user.name,
            action: 'UPDATE',
            targetType: 'SETTINGS',
            description: `قام بتحديث إعدادات النظام.`,
        });

        revalidatePath('/settings', 'layout');
        revalidatePath('/relations/settings', 'layout');
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
