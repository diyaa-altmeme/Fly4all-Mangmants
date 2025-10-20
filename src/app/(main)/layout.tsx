"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane, Menu, Bell, MessageSquare, Sun, Moon, Rocket, X, Send } from "lucide-react";
import { useThemeCustomization } from "@/context/theme-customization-context";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/layout/notification-center";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { usePathname, useRouter } from 'next/navigation';
import type { User, Client, LandingPageSettings } from "@/lib/types";
import { UserNav } from "@/components/layout/user-nav";
import { LandingPage } from "@/components/landing-page";
import { defaultSettingsData } from "@/lib/defaults";
import "@/app/globals.css";
import TopLoader from '@/components/ui/top-loader';
import { useTheme } from "next-themes";
import { getSettings } from "@/app/settings/actions";
import { GlobalSearch } from "@/components/layout/global-search";
import MainNavResponsive from "@/components/layout/main-nav-responsive";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    if (loading) {
        return <Preloader />;
    }

    if (!user) {
        // This should ideally not happen if the layout is used correctly within the AuthProvider logic
        router.replace('/');
        return <Preloader />;
    }
    
    // This is a portal for client users, they get a different layout
    if ('isClient' in user && user.isClient) {
        // For now, redirecting to a placeholder or a simpler layout
        // In the future, this can be a full-fledged client portal layout
        return <div>{children}</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40" dir="rtl">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
                 <MainNavResponsive />
                 <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        <NotificationCenter />
                    </div>
                    <UserNav />
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {children}
            </main>
        </div>
    );
}
