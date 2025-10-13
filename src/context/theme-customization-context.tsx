
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { AppSettings, ThemeSettings as TThemeSettings, SidebarThemeSettings, CardThemeSettings, LoaderSettings, ThemeCustomizationSettings as ThemeConfig, User } from '@/lib/types';
import { THEMES, getThemeFromId } from '@/lib/themes';
import { produce } from 'immer';
import { useAuth } from '@/lib/auth-context';
import { updateUser } from '@/app/users/actions';
import { getSettings } from '@/app/settings/actions';


type ThemeCustomizationContextType = {
    activeTheme: TThemeSettings;
    setActiveTheme: (themeId: string) => Promise<void>;
    isSaving: boolean;
    sidebarSettings: Partial<SidebarThemeSettings>;
    cardSettings: Partial<CardThemeSettings>;
    refreshData?: () => Promise<void>;
};

const defaultTheme = getThemeFromId('mudarib-modern');


const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export const ThemeCustomizationProvider = ({ 
  children,
}: { 
  children: React.ReactNode,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user, loading: authLoading, revalidateUser } = useAuth();
    
    const activeThemeId = useMemo(() => {
        if (user && 'role' in user && user.preferences?.themeId) {
            return user.preferences.themeId;
        }
        return 'mudarib-modern'; // Fallback default
    }, [user]);
    
    // The active theme is now purely a result of the user's preference.
    // No more merging with old, separate theme settings from the database.
     const activeTheme = useMemo(() => {
        if (authLoading) return defaultTheme; // Return default while auth is loading
        return getThemeFromId(activeThemeId);
    }, [activeThemeId, authLoading]);


    const setActiveTheme = useCallback(async (themeId: string): Promise<void> => {
        if (!user || !('role' in user)) {
            console.warn("Cannot set theme, no authenticated user found.");
            return;
        }
        setIsSaving(true);
        try {
            const currentPreferences = user.preferences || {};
            await updateUser(user.uid, { preferences: { ...currentPreferences, themeId } });
            await revalidateUser(); 
        } catch (error) {
            console.error("Failed to save active theme to user profile", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [user, revalidateUser]);
    

    const sidebarSettings = useMemo(() => activeTheme?.config?.sidebar || {}, [activeTheme]);
    const cardSettings = useMemo(() => activeTheme?.config?.card || {}, [activeTheme]);


    return (
        <ThemeCustomizationContext.Provider value={{ 
            activeTheme: activeTheme,
            setActiveTheme,
            isSaving,
            sidebarSettings,
            cardSettings,
        }}>
             {children}
        </ThemeCustomizationContext.Provider>
    );
};

export const useThemeCustomization = () => {
    const context = useContext(ThemeCustomizationContext);
    if (context === undefined) {
        throw new Error('useThemeCustomization must be used within a ThemeCustomizationProvider');
    }
    return context;
};
