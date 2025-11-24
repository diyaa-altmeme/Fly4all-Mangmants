

'use server';

import { cookies } from "next/headers";
import { getDb, getAuthAdmin } from "@/lib/firebase-admin";
import type { User, Client } from '@/lib/types';
import { ROLES_PERMISSIONS } from "@/lib/auth/roles";
import { cache } from 'react';

export async function createSessionCookie(idToken: string) {
    const authAdmin = await getAuthAdmin();
    try {
        const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        cookies().set('session', sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: expiresIn,
            path: '/',
            sameSite: 'lax',
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error creating session cookie:", error);
        return { success: false, error: "Failed to create session cookie." };
    }
}

export async function logoutUser() {
    cookies().delete('session');
}

export const getCurrentUserFromSession = cache(async (): Promise<(User & { permissions: string[] }) | (Client & { isClient: true }) | null> => {
    const authAdmin = await getAuthAdmin();
    try {
        const sessionCookie = cookies().get('session')?.value;
        if (!sessionCookie) return null;

        const decodedToken = await authAdmin.verifySessionCookie(sessionCookie, true);
        const db = await getDb();
        
        let userDoc, userData;

        // Try fetching from 'users' collection first
        userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
            userData = { uid: userDoc.id, ...userDoc.data() } as User;
            
            if (userData.role === 'admin') {
                userData.permissions = Object.keys(ROLES_PERMISSIONS).flatMap(key => ROLES_PERMISSIONS[key]);
            } else if (userData.role && ROLES_PERMISSIONS[userData.role]) {
                userData.permissions = ROLES_PERMISSIONS[userData.role];
            } else {
                userData.permissions = []; // Default to no permissions if role is not found
            }
            
            return userData as User & { permissions: string[] };
        }

        // If not found in 'users', try 'clients' collection
        userDoc = await db.collection('clients').doc(decodedToken.uid).get();
        if (userDoc.exists) {
            userData = { id: userDoc.id, ...userDoc.data(), isClient: true } as Client & { isClient: true };
            return userData;
        }

        // If user exists in Auth but not in any database collection
        if (decodedToken.email) {
            console.warn(`User with email ${decodedToken.email} exists in Auth but not in database.`);
            // Fallback user object
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || 'Unknown User',
                role: 'viewer', // Assign a default, least-privileged role
                permissions: ROLES_PERMISSIONS['viewer'] || [],
            } as User & { permissions: string[] };
        }
        
        return null;

    } catch (error: any) {
        if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/id-token-expired') {
            // This is a normal scenario, no need to log as an error
            return null;
        }
        console.error("Error getting user from session:", error);
        return null;
    }
});


export async function getUserByEmail(email: string): Promise<User | Client | null> {
    const db = await getDb();
    if (!db) return null;

    try {
        // Search in 'users' collection
        let snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data() as User;
            return { ...userData, uid: userDoc.id };
        }
        
        // Search in 'clients' collection if not found in 'users'
        snapshot = await db.collection('clients').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
            const clientDoc = snapshot.docs[0];
            return { id: clientDoc.id, ...clientDoc.data() } as Client;
        }

        return null;
    } catch (error) {
        console.error("Error getting user by email:", String(error));
        return null;
    }
}
