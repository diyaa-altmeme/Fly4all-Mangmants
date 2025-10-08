
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onIdTokenChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { useToast } from '@/hooks/use-toast';

// Define a more generic user type that can be a Client or a full User
type AuthUser = (import('@/lib/types').User & { uid: string }) | (import('@/lib/types').Client & { uid: string });

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Temporary fake user to bypass login
const fakeAdminUser: AuthUser = {
    uid: 'fake-admin-uid',
    name: 'المدير المؤقت',
    username: 'tempadmin',
    email: 'admin@local.dev',
    role: 'admin', // Crucial for permissions
    permissions: ['*'], // Grant all permissions
    status: 'active',
    phone: '000',
    requestedAt: new Date().toISOString(),
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    
    const user = fakeAdminUser;
    const loading = false;

    const logout = async () => {
        // In this disabled state, logout does nothing
        console.log("Logout function is currently disabled.");
    };

    const value = { user, loading, logout };

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
