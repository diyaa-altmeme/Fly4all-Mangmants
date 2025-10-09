
'use server';

import { getDb, getAuthAdmin } from '@/lib/firebase-admin';
import type { User, Client } from '@/lib/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getRoles } from '@/app/users/actions';

export const getUserById = cache(async (uid: string): Promise<(User & { permissions?: string[] }) | null> => {
    const db = await getDb();
    if (!db) return null;
    
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return null;

        const userData = userDoc.data() as User;
        
        let permissions: string[] = [];
        if (userData.role) {
            const roles = await getRoles();
            if(userData.role === 'admin') {
                // Admin gets all permissions implicitly
                permissions = roles.find(r => r.id === 'admin')?.permissions || [];
            } else {
                const userRole = roles.find(r => r.id === userData.role);
                if (userRole) {
                    permissions = userRole.permissions;
                }
            }
        }
        
        return { ...userData, uid, permissions };
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
        
        // After verifying the cookie, always fetch the full user data from the database
        const fullUser = await getUserById(decodedClaims.uid);
        if (fullUser) {
            return fullUser;
        }
        
        // Fallback for client login if it exists, though it's not fully implemented
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        }
        
        // If user not found in DB, something is wrong, treat as logged out.
        console.warn(`Session cookie for UID ${decodedClaims.uid} is valid, but user not found in Firestore.`);
        cookieStore.delete('session');
        return null;

    } catch (error) {
        console.error("Error verifying session cookie or fetching user data:", error);
        cookieStore.delete('session');
        return null;
    }
});


export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const auth = await getAuthAdmin();
    
    // We don't need to set custom claims here anymore, as they are not used for server-side logic.
    // The source of truth for roles/permissions is now Firestore, fetched via `getCurrentUserFromSession`.
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const cookieStore = cookies();
    cookieStore.set('session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
}

export async function logoutUser() {
    const cookieStore = cookies();
    cookieStore.delete('session');
}
