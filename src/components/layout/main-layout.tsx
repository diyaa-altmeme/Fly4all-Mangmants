
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane, Menu, Bell, MessageSquare, Sun, Moon, Rocket, X } from "lucide-react";
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


const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin'];
const landingPageRoute = '/';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { activeTheme } = useThemeCustomization();
    const { theme: mode, setTheme } = useTheme();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

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
        <div className="flex min-h-screen w-full flex-col bg-background">
            <header className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-md shadow-sm sticky top-0 z-40 w-full glass-effect glass-effect-dark">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4 space-x-reverse">
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
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-blue-500 flex items-center justify-center">
                                                <Rocket className="text-white"/>
                                            </div>
                                            <span className="gradient-text font-bold">شركتي</span>
                                        </SheetTitle>
                                        <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(false)}>
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </SheetHeader>
                                    <ScrollArea className="flex-grow">
                                        <MainNav />
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                        </div>
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                            <span className="gradient-text">نظام الإدارة الذكي</span>
                            <Rocket className="h-6 w-6 text-primary-500 bounce-element" />
                        </Link>
                        <nav className="hidden md:flex items-center space-x-6 space-x-reverse">
                            <Link href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors relative group">
                                لوحة التحكم
                                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                            </Link>
                             <Link href="/bookings" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors relative group">
                                الحجوزات
                                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                            </Link>
                             <Link href="/clients" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors relative group">
                                العملاء
                                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                            </Link>
                              <Link href="/reports" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors relative group">
                                التقارير
                                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="relative hidden md:block">
                            <Input type="text" placeholder="بحث..." 
                                   className="pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary w-64 transition-all" />
                            <i className="fas fa-search absolute right-3 top-2.5 text-gray-500"></i>
                        </div>
                        <NotificationCenter />
                         <div className="relative">
                            <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative group">
                                <MessageSquare className="text-xl" />
                                <span className="notification-badge">5</span>
                            </Button>
                        </div>
                        <UserNav />
                    </div>
                </div>
            </header>
            <TopLoader />
        <main className="flex-1 p-2 sm:p-4 md:p-6">{children}</main>
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

    