
"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane, Menu } from "lucide-react";
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
import type { User, Client } from "@/lib/types";
import { UserNav } from "./user-nav";
import { LandingHeader } from "@/components/landing-page";

const publicRoutes = ['/auth/login', '/auth/forgot-password', '/setup-admin', '/'];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { themeSettings } = useThemeCustomization();

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <header
            className={cn(
                "sticky top-0 z-40 flex h-16 items-center border-b bg-card px-4 sm:px-6 shadow-sm"
            )}
            >
            <div className="flex flex-1 items-center justify-start gap-4">
                    <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6"/>
                                <span className="sr-only">Toggle Navigation</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                            <SheetHeader className="p-4 border-b shrink-0 text-right">
                                <SheetTitle>القائمة الرئيسية</SheetTitle>
                                <SheetDescription>
                                    تنقل بين أقسام النظام المختلفة.
                                </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="flex-grow">
                                <MainNav />
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    </div>
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    {themeSettings?.assets?.sidebar_logo ? (
                    <Image
                        src={themeSettings.assets.sidebar_logo}
                        alt="Logo"
                        width={32}
                        height={32}
                        className="size-8"
                    />
                    ) : ( <Plane className="h-6 w-6 text-primary" />)}
                    <h1 className="text-xl hidden sm:block">{themeSettings?.general?.appName || "Mudarib"}</h1>
                </Link>
            </div>

            <div className="flex-1 flex justify-center items-center">
                <div className="hidden md:block w-full">
                        <MainNav />
                </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
                <NotificationCenter />
                <ThemeToggle />
                <UserNav />
            </div>
            </header>
        <main className="flex-1 p-2 sm:p-4 md:p-6 bg-muted/40">{children}</main>
        </div>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicPath = publicRoutes.some(route => pathname.startsWith(route) && (route === '/' ? pathname.length === 1 : true));

    React.useEffect(() => {
        // If auth check is done, user is not logged in, and it's not a public path, redirect to login.
        if (!loading && !user && !isPublicPath) {
            router.replace('/auth/login');
        }
    }, [user, loading, isPublicPath, router]);
    
    // While loading, show a preloader.
    if (loading) {
        return <Preloader />;
    }

    // If user is logged in (and not a client), show the main app layout.
    if (user && 'role' in user) {
        return <AppLayout>{children}</AppLayout>;
    }
    
    // If user is a client, show the client-specific layout (or just children for now)
    if (user && 'isClient' in user) {
        // This is where a dedicated client layout would go.
        return <>{children}</>;
    }
    
    // If not logged in but on a public page, show the page content.
    if (isPublicPath) {
        return <>{children}</>;
    }
    
    // In the brief moment between the auth check finishing and the redirect effect running,
    // show a preloader to prevent flashing protected content.
    return <Preloader />;
}
