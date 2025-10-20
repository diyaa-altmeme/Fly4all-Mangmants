

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane, Menu, Bell, MessageSquare, Sun, Moon, Rocket, X, Send } from "lucide-react";
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
import { GlobalSearch } from "./global-search";


const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin'];
const landingPageRoute = '/';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { activeTheme } = useThemeCustomization();
    const { theme: mode, setTheme } = useTheme();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { unreadChatCount } = useAuth();
    const pathname = usePathname();

    const isAccountStatementPage = pathname === '/reports/account-statement';

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
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
                 <div className="md:hidden">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6"/>
                                <span className="sr-only">Toggle Navigation</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                            <SheetHeader className="p-4 flex flex-row items-center justify-between border-b shrink-0 text-right">
                                <SheetTitle className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
                                        <Rocket className="text-white"/>
                                    </div>
                                    <span className="text-primary font-bold">شركتي</span>
                                </SheetTitle>
                                 <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </SheetHeader>
                            <div className="flex-grow overflow-y-auto">
                                <MainNav />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
                
                 <Link href="/dashboard" className="items-center gap-2 font-bold text-lg hidden md:flex whitespace-nowrap">
                    <Rocket className="h-6 w-6 text-primary" />
                    <span className="text-primary">حسابات الروضتين</span>
                </Link>

                 <nav className="hidden md:flex items-center gap-1 flex-grow mx-4">
                    <MainNav />
                </nav>

                 <div className="flex w-full items-center gap-4 md:ml-auto md:w-auto md:gap-2 lg:gap-4 justify-end">
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        <NotificationCenter />
                    </div>
                    <UserNav />
                </div>
            </header>
            <TopLoader />
            <main className={cn(
                "flex-1", 
                !isAccountStatementPage && "p-2 sm:p-4 md:p-6"
            )}>
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
