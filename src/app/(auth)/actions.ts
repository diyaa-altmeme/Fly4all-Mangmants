'use server';

import { getAuthAdmin, getDb } from '@/lib/firebase/firebase-admin-sdk';
import { cookies } from 'next/headers';
import { getUserById as fetchUserWithPermissions, getClientById as fetchClientWithPermissions } from '@/lib/auth/actions';
import type { User, Client, Permission } from '@/lib/types';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { scriptContext } from '@/lib/script-context';

export async function createSessionCookie(idToken: string): Promise<{ success: boolean; user?: User & { permissions?: string[] }; error?: string }> {
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const authAdmin = await getAuthAdmin();
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken, true);
        
        const userInDb = await fetchUserWithPermissions(decodedToken.uid);
        if (!userInDb) {
            throw new Error("User not found in database.");
        }

        const currentClaims = decodedToken;
        if (currentClaims.role !== userInDb?.role) {
            await authAdmin.setCustomUserClaims(decodedToken.uid, { role: userInDb?.role || 'viewer' });
        }

        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        
        cookies().set('session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        return { success: true, user: userInDb };
    } catch (error: any) {
        console.error("Error creating session cookie:", String(error));
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    cookies().delete('session');
}

export async function getCurrentUserFromSession(): Promise<(User & { permissions?: string[] }) | (Client & { isClient: true }) | null> {
    if (scriptContext.getStore()?.isScript) {
        return {
            uid: 'script_user',
            name: 'Script User',
            email: 'script@system.local',
            role: 'admin',
            permissions: Object.keys(PERMISSIONS),
        } as User & { permissions?: string[] };
    }

    const sessionCookie = cookies().get('session');

    if (!sessionCookie?.value) return null;

    try {
        const authAdmin = await getAuthAdmin();
        const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie.value, true);
        
        const fullUser = await fetchUserWithPermissions(decodedClaims.uid);
        if (fullUser) {
            return fullUser;
        }
        
        if (decodedClaims.isClient) {
             const client = await fetchClientWithPermissions(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user not found in Firestore. Logging out.`);
        cookies().delete('session');
        return null;

    } catch (error) {
        console.warn("Session verification failed, session is likely invalid. Clearing cookie.", String(error));
        cookies().delete('session');
        return null;
    }
};

export async function signInAsUser(userId: string): Promise<{ success: boolean; customToken?: string; error?: string }> {
    const authAdmin = await getAuthAdmin();
    try {
        const customToken = await authAdmin.createCustomToken(userId);
        return { success: true, customToken };
    } catch (error: any) {
        console.error("Error creating custom token for user:", String(error));
        return { success: false, error: error.message };
    }
}
