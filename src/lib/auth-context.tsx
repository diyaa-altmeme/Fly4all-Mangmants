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
  const router = useRouter();
  const pathname = usePathname();

  const verifySession = useCallback(async () => {
    // No need to set loading true here, it's true by default and on signOut
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
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await clearSession();
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    } finally {
        // We might not set loading to false here, as the redirect will trigger a re-render
    }
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    
    // Check if the user is a client (and not an employee/admin)
    if ('isClient' in user && user.isClient) {
        // Clients might have他们的 own specific set of permissions in the future
        // For now, let's assume they have very limited access.
        // A public permission allows anyone, including clients.
        if (permission === 'public') return true;
        return user.permissions?.includes(permission) || false;
    }
    
    // Admins have all permissions
    if ('role' in user && user.role === 'admin') return true;
    
    // For other roles, check if the permission exists in their permissions array
    if (user.permissions && Array.isArray(user.permissions)) {
        // If a user has a broad permission, they get all sub-permissions
        if (user.permissions.includes('reports:read:all') && permission.startsWith('reports:')) {
            return true;
        }
        return user.permissions.includes(permission);
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);