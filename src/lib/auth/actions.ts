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
                const adminRole = roles.find(r => r.id === 'admin');
                 permissions = adminRole?.permissions || [];
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
        
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        } else {
             const userData: User = {
                uid: decodedClaims.uid,
                email: decodedClaims.email || '',
                name: decodedClaims.name || '',
                role: decodedClaims.role,
                permissions: decodedClaims.permissions,
                // These fields are not in the token but are part of the type
                username: '',
                phone: '',
                status: 'active',
             };
             return userData;
        }
        return null;

    } catch (error) {
        console.error("Error verifying session cookie:", error);
        // Clear the invalid cookie
        cookieStore.delete('session');
        return null;
    }
});


export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const auth = await getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user data from firestore to add to claims
    const user = await getUserById(decodedToken.uid);

    let claims = {};
    if (user) {
        claims = {
            name: user.name,
            role: user.role,
            permissions: user.permissions
        };
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    await auth.setCustomUserClaims(decodedToken.uid, claims);
    
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