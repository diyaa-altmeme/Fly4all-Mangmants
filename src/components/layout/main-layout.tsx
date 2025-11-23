
"use client";

import React, { useEffect } from "react";
import { useAuth } from '@/lib/auth-context';
import Preloader from './preloader';
import { usePathname, useRouter } from 'next/navigation';
import TopBar from "./topbar";
import TopLoader from '@/components/ui/top-loader';
import { useThemeCustomization } from "@/context/theme-customization-context";
import { useTheme } from "next-themes";
import { Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarProvider } from "@/components/ui/sidebar";
import { MainNav } from "./main-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/i18n";


const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/auth/dev-login'];
const clientRoutes = ['/clients', '/profile']; // Routes accessible by clients

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { activeTheme } = useThemeCustomization();
    const { theme: mode } = useTheme();
    const isMobile = useIsMobile();
    const { direction, t } = useTranslation();

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
        <div dir={direction} className="flex min-h-screen w-full flex-col bg-muted/40">
            <SidebarProvider>
                {isMobile && (
                    <Sidebar>
                        <SidebarHeader>
                            <div className="flex items-center justify-between p-2">
                                <h2 className="font-bold text-lg">{t('common.mainMenu')}</h2>
                            </div>
                        </SidebarHeader>
                        <SidebarContent>
                            <SidebarGroup>
                                <MainNav />
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                )}
                <div className="flex flex-col flex-1">
                    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <TopBar />
                    </header>
                    <TopLoader />
                    <main className={"p-4 sm:px-6 sm:py-4 flex-1"}>
                        {children}
                    </main>
                </div>
            </SidebarProvider>
        </div>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicPath = publicRoutes.includes(pathname);
    const isClientPath = user && 'isClient' in user && clientRoutes.some(p => pathname.startsWith(p));
    const isLandingPage = pathname === '/';
    
    useEffect(() => {
        if (!loading) {
            if (user) {
                 if ('isClient' in user) { // If it's a client
                    if (!isClientPath) {
                        router.replace(`/clients/${user.id}`);
                    }
                } else { // If it's an employee/admin
                    if (isPublicPath || isLandingPage) {
                        router.replace('/dashboard');
                    }
                }
            } else if (!isPublicPath && !isLandingPage) {
                router.replace('/');
            }
        }
    }, [user, loading, isPublicPath, isLandingPage, isClientPath, router, pathname]);

    if (loading) {
        return <Preloader />;
    }

    // Unauthenticated user on public route or landing page
    if (!user && (isPublicPath || isLandingPage)) {
        return (
            <>
                <TopLoader />
                {children}
            </>
        );
    }
    
    // Authenticated user on a protected route
    if(user && !isPublicPath && !isLandingPage) {
        return <AppLayout>{children}</AppLayout>;
    }
    
    // Fallback/loading state for transitions
    return <Preloader />;
}
