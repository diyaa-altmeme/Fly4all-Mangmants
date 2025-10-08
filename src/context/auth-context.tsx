
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getDb } from '@/lib/firebase-admin';
import type { User, Client, Role } from '@/lib/types';
import { PERMISSIONS } from '@/lib/permissions';
import { app } from '@/lib/firebase';
import Preloader from '@/components/layout/preloader';

type AuthUser = (User & { uid: string; permissions: string[] }) | (Client & { uid: string });

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    setAuthLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);

    const fetchUserDetails = useCallback(async (firebaseUser: FirebaseUser) => {
        const db = await getDb();
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const userRole = idTokenResult.claims.role;

        let userDoc, collection;
        if (userRole) { // Employees have roles
            collection = 'users';
            userDoc = await db.collection(collection).doc(firebaseUser.uid).get();
        } else { // Clients do not
            collection = 'clients';
            userDoc = await db.collection(collection).doc(firebaseUser.uid).get();
        }

        if (userDoc.exists) {
            const userData = userDoc.data() as User | Client;
            if(userData.status !== 'active') {
                setUser(null);
                return;
            }

            if (userRole) {
                let permissions: string[] = [];
                if (userRole === 'admin') {
                    permissions = Object.keys(PERMISSIONS);
                } else {
                    const roleDoc = await db.collection('roles').doc(userRole).get();
                    if (roleDoc.exists) {
                        permissions = roleDoc.data()?.permissions || [];
                    }
                }
                setUser({ ...userData, uid: firebaseUser.uid, permissions } as AuthUser);
            } else {
                setUser({ ...userData, uid: firebaseUser.uid } as AuthUser);
            }
        } else {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    await fetchUserDetails(firebaseUser);
                } catch (error) {
                    console.error("Error fetching user details:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth, fetchUserDetails]);

    const logout = async () => {
        setLoading(true);
        await auth.signOut();
        // The onAuthStateChanged listener will handle setting user to null
    };

    const reloadUser = useCallback(async () => {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (currentUser) {
            await currentUser.getIdToken(true); // Force refresh
            await fetchUserDetails(currentUser);
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [auth, fetchUserDetails]);

    const value = { user, loading, setAuthLoading: setLoading, logout, reloadUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
