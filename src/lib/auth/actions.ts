'use server';

import { getDb, getAuthAdmin } from '@/lib/firebase-admin';
import type { User, Client } from '@/lib/types';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getRoles } from '@/app/users/actions';
import { cleanUser } from '../cleanUser';

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
            const userRole = roles.find(r => r.id === userData.role);
            if (userRole) {
                permissions = userRole.permissions;
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
        console.error(`Error getting client by ID ${id}:`, String(error));
        return null;
    }
});

export const getCurrentUserFromSession = cache(async (): Promise<(User & { permissions?: string[] }) | (Client & { isClient: true }) | null> => {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) return null;

    try {
        const decodedClaims = await getAuthAdmin().verifySessionCookie(sessionCookie.value, true);
        
        if (decodedClaims.isClient) {
             const client = await getClientById(decodedClaims.uid);
             if (client) return { ...client, isClient: true };
        } else {
            const user = await getUserById(decodedClaims.uid);
            if(user) return user;
        }
        return null;

    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
});


export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await getAuthAdmin().createSessionCookie(idToken, { expiresIn });
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
