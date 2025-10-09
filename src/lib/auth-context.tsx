
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { PERMISSIONS } from "./roles";
import type { User, Client } from '@/lib/types';
import Preloader from "@/components/layout/preloader";

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

const syncUser = async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const roleDoc = await getDoc(doc(db, 'roles', userData.role || 'viewer'));
      const permissions = roleDoc.exists() ? roleDoc.data()?.permissions : [];
      return { ...firebaseUser, ...userData, permissions, isClient: false };
  }
  
  const clientDocRef = doc(db, "clients", firebaseUser.uid);
  const clientDoc = await getDoc(clientDocRef);
  if (clientDoc.exists()) {
      return { ...firebaseUser, ...clientDoc.data(), id: clientDoc.id, isClient: true, permissions: [] } as AppUser;
  }
  
  console.warn(`No user or client profile found for UID: ${firebaseUser.uid}`);
  return null;
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        // Create session cookie
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
        const syncedUser = await syncUser(firebaseUser);
        setUser(syncedUser);
      } else {
        // Clear session cookie
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    }
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user) return false;
    if (!('isClient' in user) && user.role === 'admin') return true; // Admins have all permissions
    return user.permissions?.includes(permission) || false;
  };

  if (loading) {
    return <Preloader />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
