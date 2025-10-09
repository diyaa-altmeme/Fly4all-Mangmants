"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "./firebase";
import { PERMISSIONS } from "./permissions";
import type { User, Client } from '@/lib/types';
import Preloader from "@/components/layout/preloader";
import { getCurrentUserFromSession, clearSession } from "./auth/actions";

type AppUser = (User & { permissions: (keyof typeof PERMISSIONS)[] }) | (Client & { isClient: true, permissions: (keyof typeof PERMISSIONS)[] });

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const verifySession = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUserFromSession();
      setUser(currentUser);
    } catch (error) {
      console.error("Session verification failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth); // Sign out from client-side Firebase Auth
      await clearSession();       // Clear the server-side session cookie
      setUser(null);
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    }
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    // Admins have all permissions implicitly
    if ('role' in user && user.role === 'admin') return true;
    // For other users, check their permissions array
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, hasPermission }}>
      {loading ? <Preloader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
