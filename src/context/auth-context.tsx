
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
        try {
            const db = await getDb();
            const idTokenResult = await firebaseUser.getIdTokenResult();
            const userEmail = firebaseUser.email;

            if (!userEmail) {
                setUser(null);
                setLoading(false);
                return;
            }

            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('email', '==', userEmail).limit(1).get();

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data() as User;

                if (userData.status !== 'active') {
                    setUser(null);
                    setLoading(false);
                    return;
                }
                
                const userRole = idTokenResult.claims.role || userData.role;
                let permissions: string[] = [];
                if (userRole === 'admin') {
                    permissions = Object.keys(PERMISSIONS);
                } else if (userRole) {
                    const roleDoc = await db.collection('roles').doc(userRole).get();
                    if (roleDoc.exists) {
                        permissions = roleDoc.data()?.permissions || [];
                    }
                }
                
                setUser({ ...userData, uid: firebaseUser.uid, permissions } as AuthUser);

            } else {
                const clientsRef = db.collection('clients');
                const clientQuerySnapshot = await clientsRef.where('email', '==', userEmail).limit(1).get();
                if(!clientQuerySnapshot.empty) {
                    const clientDoc = clientQuerySnapshot.docs[0];
                    const clientData = clientDoc.data() as Client;
                     if (clientData.status !== 'active') {
                        setUser(null);
                        setLoading(false);
                        return;
                    }
                    setUser({ ...clientData, uid: firebaseUser.uid } as AuthUser);
                } else {
                    setUser(null);
                    console.warn(`No user or client found in Firestore for email: ${userEmail}`);
                }
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await fetchUserDetails(firebaseUser);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, fetchUserDetails]);
    
    const logout = async () => {
        setLoading(true);
        await auth.signOut();
        // onAuthStateChanged will handle setting user to null and loading to false
    };
    
    const reloadUser = useCallback(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setLoading(true);
            await currentUser.getIdToken(true); // Force refresh
            await fetchUserDetails(currentUser);
        }
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
