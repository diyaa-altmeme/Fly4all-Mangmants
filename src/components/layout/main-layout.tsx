
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
    const { theme: mode } = useTheme();

    React.useEffect(() => {
        if (typeof window === 'undefined' || !activeTheme) return;

        const root = document.documentElement;
        
        const applyColors = (config: any) => {
            if (!config) return;
            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key) && typeof config[key] === 'string') {
                    // Convert camelCase to kebab-case for CSS variables
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
                    {activeTheme.config.sidebar?.logoUrl ? (
                    <Image
                        src={activeTheme.config.sidebar.logoUrl}
                        alt="Logo"
                        width={32}
                        height={32}
                        className="size-8"
                    />
                    ) : ( <Plane className="h-6 w-6 text-primary" />)}
                    <h1 className="text-xl hidden sm:block">{activeTheme.config.general?.appName || "Mudarib"}</h1>
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
            <TopLoader />
        <main className="flex-1 p-2 sm:p-4 md:p-6 bg-muted/40">{children}</main>
        </div>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [landingPageSettings, setLandingPageSettings] = React.useState<LandingPageSettings | null>(null);

    const isPublicPath = publicRoutes.includes(pathname);
    const isLandingPage = pathname === landingPageRoute;

    React.useEffect(() => {
        if (!loading && user && (isPublicPath || isLandingPage)) {
            router.replace('/dashboard');
        }
    }, [user, loading, isPublicPath, isLandingPage, router, pathname]);
    
    React.useEffect(() => {
      async function fetchLandingPageSettings() {
        if (!loading && !user) { // Only fetch for logged-out users
            try {
                const settings = await getSettings();
                setLandingPageSettings(settings.theme?.landingPage || defaultSettingsData.theme.landingPage);
            } catch (error) {
                console.error("Failed to fetch landing page settings:", error);
                setLandingPageSettings(defaultSettingsData.theme.landingPage);
            }
        }
      }
      if(!user) { // Fetch settings if there's no user, regardless of path
        fetchLandingPageSettings();
      }
    }, [loading, user]);

    if (loading || (!user && !isPublicPath && !landingPageSettings)) {
        return <Preloader />;
    }

    if (!user) {
        if (isPublicPath) {
             return (
                <>
                    <TopLoader />
                    {children}
                </>
            );
        }
        // If not a public path and no user, show landing page
        if(landingPageSettings) {
             return (
                 <>
                    <TopLoader />
                    <LandingPage settings={landingPageSettings} />
                 </>
            );
        }
        // Fallback preloader while settings load
        return <Preloader />;
    }
    
    return <AppLayout>{children}</AppLayout>;
}
