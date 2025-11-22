
'use server';

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { User, Client } from '@/lib/types';
import { getRoles } from '@/app/users/actions';
import { PERMISSIONS } from './permissions';

export const getUserById = async (uid: string): Promise<(User & { permissions?: string[] }) | null> => {
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
        console.error("Error fetching user by ID:", String(error));
        return null;
    }
};

export const getClientById = async (id: string): Promise<Client | null> => {
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
};

export const getUserByEmail = async (email: string): Promise<(User & { permissions?: string[] }) | null> => {
    const db = await getDb();
    if (!db) return null;

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return null;
        }

        const userDoc = snapshot.docs[0];
        return getUserById(userDoc.id);

    } catch (error) {
        console.error("Error getting user by email:", String(error));
        return null;
    }
};
    