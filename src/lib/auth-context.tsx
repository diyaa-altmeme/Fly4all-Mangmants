
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, Client, Permission } from '@/lib/types';
import { createSessionCookie, getCurrentUserFromSession, logoutUser, getUserById } from '@/lib/auth/actions';
import { useRouter, usePathname } from 'next/navigation';
import { hasPermission as checkUserPermission } from '@/lib/permissions';
import { PERMISSIONS } from './auth/permissions';
import Preloader from '@/components/layout/preloader';
import { getSettings } from '@/app/settings/actions';

interface AuthContextType {
  user: (User & { permissions?: string[] }) | (Client & { isClient: true }) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof PERMISSIONS) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];
const ADMIN_UID = "5V2a9sFmEjZosRARbpA8deWhdVJ3"; // ضياء التميمي

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    const setAuthPersistence = async () => {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (error) {
            console.error("Failed to set authentication persistence:", error);
        }
    };
    
    setAuthPersistence();

    const initializeAuth = async () => {
        try {
            const settings = await getSettings();
            if (settings.developerSettings?.devModeEnabled) {
                console.warn("Developer Mode is active. Bypassing login and cookie logic.");
                const devUser = await getUserById(ADMIN_UID);
                if (devUser) {
                    setUser(devUser);
                    if (isPublicRoute) router.replace('/dashboard');
                } else {
                    throw new Error("Failed to fetch developer user account.");
                }
                setLoading(false);
                return; // Stop further auth processing
            }

            const sessionUser = await getCurrentUserFromSession();
            setUser(sessionUser);
            if (!sessionUser && !isPublicRoute) {
                router.replace('/auth/login');
            } else if (sessionUser && isPublicRoute) {
                router.replace('/dashboard');
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
            setUser(null);
            if (!isPublicRoute) router.replace('/auth/login');
        } finally {
            setLoading(false);
        }
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const sessionResult = await createSessionCookie(idToken);
      if (!sessionResult.success) {
          throw new Error(sessionResult.error || 'Failed to create session cookie.');
      }
      
      // Crucial fix: After creating the cookie, immediately re-fetch the user from the server session
      // This updates the provider's state and breaks the loading loop.
      const sessionUser = await getCurrentUserFromSession();
       if (sessionUser) {
        setUser(sessionUser);
        router.push('/dashboard');
      } else {
        throw new Error('Failed to retrieve user session after login.');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sign-in error:', error);
      let errorMessage = 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'هذا الحساب معطل.';
      }
      setLoading(false);
      return { success: false, error: errorMessage };
    } finally {
        // We set loading to false only on failure. On success, the page will reload.
    }
  };

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    await logoutUser(); // Clears server-side cookie
    setUser(null);
    router.push('/auth/login');
  };

  const hasPermission = (permission: keyof typeof PERMISSIONS): boolean => {
    if (!user || ('isClient' in user && user.isClient)) return false;
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
