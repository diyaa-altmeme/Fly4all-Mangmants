
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { PERMISSIONS, hasPermission as hasPermissionUtil } from "./permissions";
import type { User, Client } from '@/lib/types';
import Preloader from "@/components/layout/preloader";
import { getCurrentUserFromSession, clearSession } from "./auth/actions";
import { useRouter, usePathname } from "next/navigation";

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
  const pathname = usePathname();

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
  }, [verifySession, pathname]); // Re-verify on path change to catch session expiry

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await clearSession();
      setUser(null);
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
      setUser(null); 
    } finally {
       setLoading(false);
    }
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    return hasPermissionUtil(user, permission);
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
