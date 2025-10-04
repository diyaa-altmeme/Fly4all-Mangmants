
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { updateSettings, getSettings } from '@/app/settings/actions';
import type { AppSettings, ThemeSettings, SidebarThemeSettings, CardThemeSettings, LoaderSettings, ThemeCustomizationSettings as ThemeConfig } from '@/lib/themes';
import { THEMES, getThemeFromId } from '@/lib/themes';
import { produce } from 'immer';
import { useTheme } from 'next-themes';


type ThemeCustomizationContextType = {
    activeTheme: ThemeSettings;
    setActiveTheme: (themeId: string) => Promise<void>;
    isSaving: boolean;
    sidebarSettings: Partial<SidebarThemeSettings>;
    cardSettings: Partial<CardThemeSettings>;
    themeSettings: ThemeConfig | null;
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

    useEffect(() => {
        getSettings().then(s => {
            setThemeSettings(s.theme || null);
            setLoading(false);
        });
    }, []);

    const activeTheme = useMemo(() => {
      if (loading || !themeSettings) return defaultTheme;
      const baseTheme = getThemeFromId(themeSettings?.activeThemeId || 'mudarib-modern');
      // Deep merge with customizations from settings
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
    }, [themeSettings, loading]);


     useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const setActiveTheme = useCallback(async (themeId: string): Promise<void> => {
        setIsSaving(true);
        try {
            const settings = await getSettings();
            const themeToSet = getThemeFromId(themeId);
            const newSettings: AppSettings['theme'] = { 
                ...(settings.theme || {}), 
                ...themeToSet.config, 
                activeThemeId: themeId 
            };
            await updateSettings({ theme: newSettings });
            setThemeSettings(newSettings);
        } catch (error) {
            console.error("Failed to save active theme", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, []);
    
    useEffect(() => {
        if (typeof window === 'undefined' || !isMounted) return;

        const themeToApply = activeTheme;
        const { light, dark, loader, sidebar, card } = themeToApply.config;
        const root = document.documentElement;

        const applyVariables = (config: any, prefix = '') => {
            if (!config) return;
            for (const [key, value] of Object.entries(config)) {
                 if (value && typeof value !== 'object') {
                    const cssVar = `--${prefix}${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                    root.style.setProperty(cssVar, String(value));
                }
            }
        };
        
        const colors = mode === 'dark' ? dark : light;
        
        Object.entries(colors).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                root.style.setProperty(cssVar, value);
            }
        });
        
        if(sidebar) applyVariables(sidebar, 'sidebar-');
        if(card) applyVariables(card, 'card-');
        
        const nprogressEl = document.getElementById('nprogress');
        if (nprogressEl && loader) {
            const bar = nprogressEl.querySelector('.bar') as HTMLElement;
            if (bar) {
                bar.style.background = loader.color || '#29d';
                bar.style.height = `${loader.height || 3}px`;
                bar.style.boxShadow = loader.showShadow ? `0 0 10px ${loader.color}, 0 0 5px ${loader.color}` : 'none';
            }
        }

    }, [activeTheme, isMounted, mode]);

    const sidebarSettings = useMemo(() => activeTheme.config.sidebar || {}, [activeTheme]);
    const cardSettings = useMemo(() => activeTheme.config.card || {}, [activeTheme]);


    return (
        <ThemeCustomizationContext.Provider value={{ 
            activeTheme,
            setActiveTheme,
            isSaving,
            sidebarSettings,
            cardSettings,
            themeSettings,
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
