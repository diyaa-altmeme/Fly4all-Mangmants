
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import type { User, Client } from '@/lib/types';
import Preloader from '@/components/layout/preloader';
import { app } from '@/lib/firebase';

type AuthContextType = {
    user: (User & { uid: string; permissions: string[] }) | (Client & { uid: string }) | null;
    loading: boolean;
    setAuthLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<(User & { uid: string; permissions: string[] }) | (Client & { uid: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);

    const fetchUserAppData = useCallback(async (firebaseUser: FirebaseUser | null): Promise<void> => {
        if (firebaseUser) {
            try {
                // At this point, the server-side logic can verify the user via its UID from the token
                // For simplicity in this context, we will fetch user details based on the session logic
                // In a production app, you might pass the token to your backend to get role-based data
                const appUser = await getCurrentUserFromSession();
                setUser(appUser);
            } catch (error) {
                console.error("Failed to fetch app-specific user data", error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setLoading(true);
            fetchUserAppData(firebaseUser);
        });
        return () => unsubscribe();
    }, [auth, fetchUserAppData]);
    
    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const reloadUser = useCallback(async () => {
        setLoading(true);
        await fetchUserAppData(auth.currentUser);
    }, [auth.currentUser, fetchUserAppData]);


    const value = { user, loading, setAuthLoading: setLoading, logout, reloadUser };
    
    // Do not render children until authentication state is resolved
    if (loading) {
        return <Preloader />;
    }

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
