
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSettings, updateSettings } from '@/app/settings/actions';
import type { AppSettings, ThemeSettings as TThemeSettings, SidebarThemeSettings, CardThemeSettings, LoaderSettings, ThemeCustomizationSettings as ThemeConfig, User } from '@/lib/types';
import { THEMES, getThemeFromId } from '@/lib/themes';
import { produce } from 'immer';
import { useAuth } from '@/lib/auth-context';
import { updateUser } from '@/app/users/actions';


type ThemeCustomizationContextType = {
    activeTheme: TThemeSettings;
    setActiveTheme: (themeId: string) => Promise<void>;
    isSaving: boolean;
    sidebarSettings: Partial<SidebarThemeSettings>;
    cardSettings: Partial<CardThemeSettings>;
    themeSettings: ThemeConfig | null;
    refreshData?: () => Promise<void>;
};

const defaultTheme = getThemeFromId('mudarib-modern');


const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export const ThemeCustomizationProvider = ({ 
  children,
}: { 
  children: React.ReactNode,
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [themeSettings, setThemeSettings] = useState<ThemeConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user, revalidateUser } = useAuth(); // Depend on the auth context
    
    // Now activeThemeId is derived directly from the auth context's user state
    const activeThemeId = useMemo(() => {
        if (user && 'role' in user && user.preferences?.themeId) {
            return user.preferences.themeId;
        }
        return 'mudarib-modern'; // Fallback default
    }, [user]);

    const refreshData = useCallback(async () => {
        setLoading(true);
         getSettings().then(s => {
            setThemeSettings(s.theme || null);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

     const activeTheme = useMemo(() => {
      if (!user || loading || !themeSettings) return defaultTheme;
      
      const baseTheme = getThemeFromId(activeThemeId);
      
      const mergedConfig = produce(baseTheme.config, draft => {
        if(themeSettings) {
            draft.light = { ...draft.light, ...themeSettings.light };
            draft.dark = { ...draft.dark, ...themeSettings.dark };
            draft.sidebar = { ...draft.sidebar, ...themeSettings.sidebar };
            draft.card = { ...draft.card, ...themeSettings.card };
            draft.loader = { ...draft.loader, ...themeSettings.loader };
        }
      });

      return {
        ...baseTheme,
        config: mergedConfig
      };

    }, [themeSettings, loading, activeThemeId, user]);


     useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const setActiveTheme = useCallback(async (themeId: string): Promise<void> => {
        if (!user || !('role' in user)) {
            console.warn("Cannot set theme, no authenticated user found.");
            return;
        }
        setIsSaving(true);
        try {
            const currentPreferences = user.preferences || {};
            await updateUser(user.uid, { preferences: { ...currentPreferences, themeId } });
            await revalidateUser(); // This will re-fetch user and trigger all dependent effects
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
            themeSettings,
            refreshData
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

