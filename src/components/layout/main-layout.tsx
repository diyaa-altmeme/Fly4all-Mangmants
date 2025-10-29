"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/layout/main-nav";
import { useThemeCustomization } from "@/context/theme-customization-context";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import NotificationCenter from "./notification-center";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/lib/auth-context';
import Preloader from './preloader';
import { usePathname, useRouter } from 'next/navigation';
import type { User, Client, LandingPageSettings } from "@/lib/types";
import { UserNav } from "./user-nav";
import { LandingPage } from "@/components/landing-page";
import { defaultSettingsData } from "@/lib/defaults";
import "@/app/globals.css";
import TopLoader from '@/components/ui/top-loader';
import { useTheme } from "next-themes";
import { getSettings } from "@/app/settings/actions";
import TopBar from "./topbar";


const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin'];
const landingPageRoute = '/';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { activeTheme } = useThemeCustomization();
    const { theme: mode, setTheme } = useTheme();

    React.useEffect(() => {
        if (typeof window === 'undefined' || !activeTheme) return;

        const root = document.documentElement;
        
        const applyColors = (config: any) => {
            if (!config) return;
            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key) && typeof config[key] === 'string') {
                    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                    root.style.setProperty(cssVar, config[key]);
                }
            }
        };

        const colors = mode === 'dark' ? activeTheme.config.dark : activeTheme.config.light;
        applyColors(colors);
        
        const { loader } = activeTheme.config;
        if (loader) {
            const barColor = loader.color || 'hsl(var(--primary))';
            const shadow = loader.showShadow ? `0 0 10px ${barColor}, 0 0 5px ${barColor}` : 'none';
            
            root.style.setProperty('--loader-color', barColor);
            root.style.setProperty('--loader-shadow', shadow);
            root.style.setProperty('--loader-height', `${loader.height || 3}px`);
        }
        
    }, [activeTheme, mode]);


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <TopBar />
            <TopLoader />
            <main className="flex-1 p-2 sm:p-4 md:p-6">
                {children}
            </main>
        </div>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicPath = publicRoutes.includes(pathname);
    const isLandingPage = pathname === landingPageRoute;
    
    useEffect(() => {
        if (!loading) {
            if (user && (isPublicPath || isLandingPage)) {
                router.replace('/dashboard');
            } else if (!user && !isPublicPath && !isLandingPage) {
                router.replace('/');
            }
        }
    }, [user, loading, isPublicPath, isLandingPage, router, pathname]);

    if (loading) {
        return <Preloader />;
    }

    if (!user) {
        if (isPublicPath || isLandingPage) {
             return (
                <>
                    <TopLoader />
                    {children}
                </>
            );
        }
        return <Preloader />; 
    }
    
    return <AppLayout>{children}</AppLayout>;
}
