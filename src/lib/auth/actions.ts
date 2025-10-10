
'use server';

import { getDb, getAuthAdmin } from '@/lib/firebase-admin';
import type { User, Client } from '@/lib/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getRoles } from '@/app/users/actions';
import { PERMISSIONS } from './permissions';

export const getUserById = cache(async (uid: string): Promise<(User & { permissions?: string[] }) | null> => {
    const db = await getDb();
    if (!db) return null;
    
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return null;

        const userData = userDoc.data() as User;
        
        const allRoles = await getRoles();
        let permissions: string[] = [];

        if (userData.role) {
            if(userData.role === 'admin') {
                // Admin gets all permissions implicitly from the defined roles list.
                 permissions = Object.keys(PERMISSIONS);
            } else {
                const userRole = allRoles.find(r => r.id === userData.role);
                if (userRole) {
                    permissions = userRole.permissions || [];
                }
            }
        }
        
        return { ...userData, uid, permissions: [...new Set(permissions)] };
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
});

export const getClientById = cache(async (id: string): Promise<Client | null> => {
    const db = await getDb();
    if (!db) return null;

    try {
        const doc = await db.collection('clients').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data() as any;
        
        const safeData = JSON.parse(JSON.stringify(data, (key, value) => {
            if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
                return new Date(value.seconds * 1000).toISOString();
            }
            return value;
        }));

        return {
            id: doc.id,
            ...safeData,
        } as Client;
    } catch (error) {
        console.error(`Error getting client by ID ${''}${id}:`, String(error));
        return null;
    }
});

export const getCurrentUserFromSession = cache(async (): Promise<(User & { permissions?: string[] }) | (Client & { isClient: true }) | null> => {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) return null;

    try {
        const auth = await getAuthAdmin();
        const decodedClaims = await auth.verifySessionCookie(sessionCookie.value, true);
        
        const fullUser = await getUserById(decodedClaims.uid);
        if (fullUser) {
            return fullUser;
        }
        
        // This part is for potential future client login
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        // If user not found in DB but has a valid session, something is wrong. Log out.
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user not found in Firestore. Logging out.`);
        cookies().delete('session');
        return null;

    } catch (error) {
        // Session cookie is invalid.
        cookies().delete('session');
        return null;
    }
});


export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const auth = await getAuthAdmin();
    
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userInAuth = await auth.getUser(decodedToken.uid);
        
        // Fetch user data from Firestore to get the role
        const userInDb = await getUserById(decodedToken.uid);

        // Set custom claims if they don't exist or are different
        const currentClaims = userInAuth.customClaims || {};
        if (currentClaims.role !== userInDb?.role) {
            await auth.setCustomUserClaims(decodedToken.uid, { role: userInDb?.role || 'viewer' });
        }

        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
        
        cookies().set('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating session cookie:", error);
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    cookies().delete('session');
}
