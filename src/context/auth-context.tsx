
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUserFromSession, logoutUser } from '@/app/auth/actions';
import type { User, Client } from '@/lib/types';
import Preloader from '@/components/layout/preloader';

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

    const fetchUser = useCallback(async () => {
        try {
            const currentUser = await getCurrentUserFromSession();
            setUser(currentUser);
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const logout = async () => {
        await logoutUser();
        setUser(null);
    };

    const value = { user, loading, setAuthLoading: setLoading, logout, reloadUser: fetchUser };
    
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
