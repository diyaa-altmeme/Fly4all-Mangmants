
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import type { User, Client } from '@/lib/types';
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

    const fetchUser = useCallback(async () => {
        try {
            const appUser = await getCurrentUserFromSession();
            setUser(appUser);
        } catch (error) {
            console.error("Failed to fetch current user session", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);
    
    const logout = async () => {
        const { logoutUser } = await import('@/app/auth/actions');
        await logoutUser();
        setUser(null);
    };

    const reloadUser = useCallback(async () => {
        setLoading(true);
        await fetchUser();
    }, [fetchUser]);


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
