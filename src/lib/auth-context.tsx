
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { createSessionCookie, getCurrentUserFromSession, logoutUser } from '@/lib/auth/actions';
import { useRouter } from 'next/navigation';
import { hasPermission as checkUserPermission } from '@/lib/permissions';
import { PERMISSIONS } from './permissions';
import Preloader from '@/components/layout/preloader';

interface AuthContextType {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
        try {
            const sessionUser = await getCurrentUserFromSession();
            setUser(sessionUser);
        } catch (error) {
            console.error("Failed to check session on initial load", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };
    
    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      await createSessionCookie(idToken);
      const sessionUser = await getCurrentUserFromSession();
      setUser(sessionUser);
      router.push('/dashboard');
      return { success: true };
    } catch (error: any) {
      console.error('Sign-in error:', error);
      let errorMessage = 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'هذا الحساب معطل.';
      }
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    await logoutUser();
    setUser(null);
    setLoading(false);
    router.push('/auth/login');
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user || 'isClient' in user) return false;
    return checkUserPermission(user, permission);
  }
  
  if (loading) {
    return <Preloader />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
