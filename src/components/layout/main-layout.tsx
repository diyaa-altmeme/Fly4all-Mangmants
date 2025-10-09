"use client";

import * as React from "react";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, CircleUserRound, Menu, LogOut } from "lucide-react";
import { MainNav } from "@/components/layout/main-nav";
import { useThemeCustomization } from "@/context/theme-customization-context";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { VoucherNavProvider } from "@/context/voucher-nav-context";
import { useRouter, usePathname } from "next/navigation";
import NotificationCenter from "./notification-center";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from '@/lib/auth-context';
import Preloader from './preloader';
import type { User, Client } from "@/lib/types";
import ClientViewLayout from "@/app/clients/[id]/components/client-view-layout";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { themeSettings } = useThemeCustomization();
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push('/auth/login');
    }

    return (
      <VoucherNavProvider>
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
                      ) : ( <Plane className="h-6 w-6 text-primary"/>)}
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
                  {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar>
                            <AvatarImage src={user?.avatarUrl || undefined} />
                            <AvatarFallback>
                              <CircleUserRound />
                            </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{user?.name || 'زائر'}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/profile">الملف الشخصي</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/support">الدعم</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                              <LogOut className="me-2 h-4 w-4"/>
                              تسجيل الخروج
                            </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  ) : null}
              </div>
              </header>
          <main className="flex-1 p-2 sm:p-4 md:p-6 bg-muted/40">{children}</main>
          </div>
      </VoucherNavProvider>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const publicRoutes = ['/auth/login', '/auth/forgot-password', '/register', '/setup-admin'];
    
    // AuthProvider now shows a preloader, so we don't need another one here.
    // We just need to handle redirection logic.
    React.useEffect(() => {
      if (!loading && !user && !publicRoutes.includes(pathname)) {
        router.replace('/auth/login');
      }
    }, [user, loading, router, pathname, publicRoutes]);
    
    // If we're on a public route, just render the content without any layout.
    if (publicRoutes.includes(pathname)) {
        return <>{children}</>;
    }
    
    // If a user is logged in, decide which layout to show.
    if (user) {
        if ('isClient' in user && user.isClient) {
            return <ClientViewLayout client={user as Client}>{children}</ClientViewLayout>;
        }
        return <AppLayout>{children}</AppLayout>;
    }

    // If no user and not a public route, show preloader while redirecting.
    return <Preloader />;
}