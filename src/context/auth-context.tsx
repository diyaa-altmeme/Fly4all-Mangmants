"use client";

import type { User, Client } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
    user: User | Client | null | undefined;
    loading: boolean;
    setAuthLoading: (isLoading: boolean) => void;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: undefined, loading: true, setAuthLoading: () => {}, refreshUser: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | Client | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    
    const fetchUserSession = useCallback(async () => {
        // This function will be called by onAuthStateChanged, so we don't need to set loading here.
        try {
            const sessionUser = await getCurrentUserFromSession();
            setUser(sessionUser);
        } catch (error) {
            console.error("Failed to fetch user session", error);
            setUser(null);
        }
        // Loading state will be managed by the listener
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                await fetchUserSession();
            } else {
                setUser(null);
            }
             // Add a small delay to prevent UI flashing
            setTimeout(() => setLoading(false), 300);
        });

        return () => unsubscribe();
    }, [fetchUserSession]);

    const refreshUser = useCallback(async () => {
        setLoading(true);
        await fetchUserSession();
        setLoading(false);
    }, [fetchUserSession]);

    return (
        <AuthContext.Provider value={{ user, loading, setAuthLoading: setLoading, refreshUser }}>
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
