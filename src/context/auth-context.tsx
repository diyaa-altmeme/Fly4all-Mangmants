
"use client";

import type { User, Client } from '@/lib/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrentUserFromSession } from '@/app/auth/actions';

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
    
    const fetchUser = useCallback(async () => {
        // Don't set loading to true here to avoid flashing the preloader on every refresh.
        // The MainLayout will handle the initial preloader.
        try {
            const sessionUser = await getCurrentUserFromSession();
            setUser(sessionUser);
        } catch (error) {
            console.error("Failed to fetch user session", error);
            setUser(null);
        } finally {
            // A small delay to make the transition smoother if the fetch is very fast
             setTimeout(() => setLoading(false), 250);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <AuthContext.Provider value={{ user, loading, setAuthLoading: setLoading, refreshUser: fetchUser }}>
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
