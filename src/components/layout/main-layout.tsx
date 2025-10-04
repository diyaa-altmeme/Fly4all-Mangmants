
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
import { Plane, CircleUserRound, Menu, LogOut, Loader2, Network, Rocket } from "lucide-react";
import { MainNav } from "@/components/layout/main-nav";
import { useThemeCustomization } from "@/context/theme-customization-context";
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { VoucherNavProvider } from "@/context/voucher-nav-context";
import { usePathname, useRouter } from "next/navigation";
import NotificationCenter from "./notification-center";
import type { User, Client, AppSettings } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutUser } from '@/app/auth/actions';
import LandingPage from '@/components/landing-page';
import { motion, AnimatePresence } from 'framer-motion';


const Preloader = () => {
    const [stars, setStars] = React.useState<React.CSSProperties[]>([]);

    React.useEffect(() => {
        const generatedStars = [...Array(50)].map(() => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `twinkle ${Math.random() * 5 + 2}s linear infinite ${Math.random() * 2}s`,
        }));
        setStars(generatedStars);
    }, []);

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#23005a] overflow-hidden"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
        >
            {/* Starry background */}
            <div className="absolute inset-0 z-0">
                {stars.map((style, i) => (
                    <div key={i} className="absolute h-0.5 w-0.5 bg-white rounded-full" style={style}></div>
                ))}
            </div>
            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ 
                    scale: [0.5, 1.2, 1], 
                    y: [0, -15, 0],
                    opacity: 1
                }}
                exit={{ scale: 5, opacity: 0 }}
                transition={{
                    scale: { duration: 0.8, ease: "backOut" },
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.5 }
                }}
                className="z-10"
            >
                <Rocket className="h-20 w-20 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </motion.div>
        </motion.div>
    );
};



const MobileNav = () => {
    return (
        <div className="grid gap-2 text-lg font-medium p-4">
           <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 text-lg font-semibold"
            >
                <Plane className="h-6 w-6" />
                <span>Mudarib</span>
            </Link>
           <MainNav />
        </div>
    )
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { themeSettings } = useThemeCustomization();
    const { user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.push('/auth/login');
        window.location.reload(); 
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
                              <SheetHeader className="p-4 border-b shrink-0">
                                  <SheetTitle>القائمة الرئيسية</SheetTitle>
                                  <SheetDescription>
                                      تنقل بين أقسام النظام المختلفة.
                                  </SheetDescription>
                              </SheetHeader>
                              <ScrollArea className="flex-grow">
                                  <MobileNav />
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
                            <AvatarImage src={user?.avatarUrl} />
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
                  ) : <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />}
              </div>
              </header>
          <main className="flex-1 p-2 sm:p-4 md:p-6 bg-muted/40">{children}</main>
          </div>
      </VoucherNavProvider>
    );
};


export function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [isClient, setIsClient] = React.useState(false);
    const pathname = usePathname();
    const router = useRouter();

    React.useEffect(() => {
        setIsClient(true);
    }, []);
    
    React.useEffect(() => {
        if (!isClient || authLoading) {
            return;
        }

        const isAuthPage = pathname.startsWith('/auth/login');
        const isPublicPage = pathname === '/';

        if (!user && !isAuthPage && !isPublicPage) {
            router.push('/auth/login');
        }
        
        if (user && (isAuthPage || isPublicPage)) {
            router.push('/dashboard');
        }

    }, [user, authLoading, pathname, router, isClient]);

    if (authLoading || !isClient) {
        return <Preloader />;
    }

    if (!user) {
        const isPublicPage = pathname === '/';
        if (isPublicPage) return <LandingPage />;
        if (pathname.startsWith('/auth/login')) return <>{children}</>;
        
        return <Preloader />;
    }
    
    return <AppLayout>{children}</AppLayout>;
}
