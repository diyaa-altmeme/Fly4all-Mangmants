'use server';

import { getAuthAdmin, getDb } from '@/lib/firebase/firebase-admin-sdk';
import { cookies } from 'next/headers';
import type { User, Client } from '@/lib/types';
import { getUserById as fetchUserWithPermissions, getClientById as fetchClientWithPermissions } from '@/lib/auth/actions';

export async function createSessionCookie(idToken: string): Promise<{ success: boolean; error?: string }> {
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const authAdmin = await getAuthAdmin();
    
    try {
        await authAdmin.verifyIdToken(idToken);
        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        
        cookies().set('session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating session cookie:", String(error));
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    cookies().delete('session');
}

export async function getCurrentUserFromSession(): Promise<(User & { permissions?: string[] }) | (Client & { isClient: true }) | null> {

    const sessionCookie = cookies().get('session');

    if (!sessionCookie?.value) return null;

    try {
        const authAdmin = await getAuthAdmin();
        const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie.value, true);
        
        // Check if it's a regular user first
        const fullUser = await fetchUserWithPermissions(decodedClaims.uid);
        if (fullUser) {
            return fullUser;
        }
        
        // If not a regular user, check if it's a client
        if (decodedClaims.isClient) {
             const client = await fetchClientWithPermissions(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user/client not found in Firestore. Logging out.`);
        logoutUser();
        return null;

    } catch (error) {
        // Session cookie is invalid, expired, etc.
        console.warn("Session verification failed, session is likely invalid. Clearing cookie.", String(error));
        logoutUser();
        return null;
    }
};
