
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { updateSettings, getSettings } from '@/app/settings/actions';
import type { AppSettings, ThemeSettings, SidebarThemeSettings, CardThemeSettings, LoaderSettings, ThemeCustomizationSettings as ThemeConfig, User } from '@/lib/types';
import { THEMES, getThemeFromId } from '@/lib/themes';
import { produce } from 'immer';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { updateUser } from '@/app/users/actions';


type ThemeCustomizationContextType = {
    activeTheme: ThemeSettings;
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
    const { theme: mode, setTheme } = useTheme();
    const { user, revalidateUser } = useAuth();
    
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
      if (loading || !themeSettings) return defaultTheme;
      
      const baseTheme = getThemeFromId(activeThemeId);
      
      return produce(baseTheme, draft => {
          if (themeSettings) {
              draft.config = {
                  ...draft.config,
                  ...themeSettings,
                  sidebar: { ...draft.config.sidebar, ...themeSettings.sidebar },
                  card: { ...draft.config.card, ...themeSettings.card },
                  loader: { ...draft.config.loader, ...themeSettings.loader },
                  light: { ...draft.config.light, ...themeSettings.light },
                  dark: { ...draft.config.dark, ...themeSettings.dark },
              };
          }
      });
    }, [themeSettings, loading, activeThemeId]);


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
            await updateUser(user.uid, { preferences: { ...user.preferences, themeId } });
            await revalidateUser(); // Re-fetch user data to update the UI
        } catch (error) {
            console.error("Failed to save active theme to user profile", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [user, revalidateUser]);
    
    useEffect(() => {
        if (typeof window === 'undefined' || !isMounted || !activeTheme) return;

        const { light, dark, loader } = activeTheme.config;
        const root = document.documentElement;

        const applyColors = (config: any, prefix = '') => {
             if (!config) return;
            for (const [key, value] of Object.entries(config)) {
                 if (value && typeof value !== 'object') {
                    const cssVar = `--${prefix}${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                    root.style.setProperty(cssVar, String(value));
                }
            }
        };
        
        const colors = mode === 'dark' ? dark : light;
        applyColors(colors);
        
        if (loader) {
            const barColor = loader.color || 'hsl(var(--primary))';
            const shadow = loader.showShadow ? `0 0 10px ${barColor}, 0 0 5px ${barColor}` : 'none';
            
            root.style.setProperty('--loader-color', barColor);
            root.style.setProperty('--loader-shadow', shadow);
            root.style.setProperty('--loader-height', `${loader.height || 3}px`);
        }
        
    }, [activeTheme, isMounted, mode]);

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
