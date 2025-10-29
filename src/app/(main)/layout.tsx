
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
    Rocket,
    Menu,
    X,
    LayoutDashboard,
    Wallet,
    BarChart3,
    Users,
    Settings,
    MessageSquare,
    Activity,
    Briefcase
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { usePathname, useRouter } from 'next/navigation';
import { UserNav } from "@/components/layout/user-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import MainNavResponsive from "@/components/layout/main-nav-responsive";
import NotificationCenter from "@/components/layout/notification-center";
import { MainNav } from "@/components/layout/main-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    if (loading) {
        return <Preloader />;
    }

    if (!user) {
        // This should ideally not happen if the layout is used correctly
        router.replace('/');
        return <Preloader />;
    }
    
    // This is a portal for client users, they get a different layout
    if ('isClient' in user && user.isClient) {
        return <div>{children}</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40" dir="rtl">
            <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
                <div className="flex items-center gap-2 md:hidden">
                     <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6"/>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                           <SheetHeader className="p-4 flex flex-row items-center justify-between border-b shrink-0 text-right">
                                <SheetTitle className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
                                        <Rocket className="text-white"/>
                                    </div>
                                    <span className="text-primary font-bold">Mudarib</span>
                                </SheetTitle>
                                 <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </SheetHeader>
                            <div className="flex-grow overflow-y-auto">
                                <MainNav isMobile={true}/>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                        <Rocket className="h-6 w-6 text-primary" />
                    </Link>
                </div>
                
                <div className="hidden md:flex w-full items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg mr-4">
                        <Rocket className="h-6 w-6 text-primary" />
                        <span className="text-primary whitespace-nowrap">نظام المحاسبة</span>
                    </Link>
                    <div className="flex-grow flex justify-center">
                        <MainNav />
                    </div>
                </div>

                 <div className="flex items-center gap-2 ml-auto">
                    <GlobalSearch />
                    <ThemeToggle />
                    <NotificationCenter />
                    <UserNav />
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {children}
            </main>
        </div>
    );
}

