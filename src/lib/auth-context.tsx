
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import type { User, Client } from '@/lib/types';
import { getClientById, getUserById } from '@/app/auth/actions';
import Preloader from '@/components/layout/preloader';
import { app } from '@/lib/firebase';
import { hasPermission as checkPermission, PERMISSIONS } from '@/lib/permissions';

type AuthContextType = {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // First, try to fetch as a regular User
        const userData = await getUserById(firebaseUser.uid);
        if (userData) {
          setUser(userData);
        } else {
          // If not a regular user, try to fetch as a Client
          const clientData = await getClientById(firebaseUser.uid);
          if (clientData) {
            setUser({ ...clientData, isClient: true });
          } else {
            // If neither, there's an issue. For now, treat as logged out.
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    return checkPermission(user, permission);
  };
  
  if (loading) {
    return <Preloader />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission }}>
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
