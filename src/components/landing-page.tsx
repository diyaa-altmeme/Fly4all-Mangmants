
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Rocket, BarChart3, ShieldCheck, Repeat, ArrowLeft, LucideIcon, HelpCircle, BedDouble, Users, Store, CheckCircle, Smartphone, CreditCard, Ticket, MessageSquare, Target, BarChart2, Zap, Send, FileText as FileTextIcon, Wallet, Bell, LineChart, TargetIcon, FileText, GitBranch, Layers3, Network, Menu } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Autoplay from "embla-carousel-autoplay"
import { Badge } from '@/components/ui/badge';
import type { LandingPageFeature, LandingPageFaqItem, LandingPagePartner, ThemeCustomizationSettings, SidebarThemeSettings } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';


export const LandingHeader = ({ showTitle, isScrolled }: { showTitle: boolean, isScrolled: boolean }) => {
    const router = useRouter();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const menuItems = [
        { label: 'خدماتنا', section: 'servicesSection' },
        { label: 'من نحن', section: 'aboutUs' },
        { label: 'إدارة الديون', section: 'debtsManagement' },
        { label: 'الأسئلة الشائعة', section: 'faqSection' },
    ];

    const scrollToSection = (sectionId: string) => {
        setIsSheetOpen(false);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    return (
        <header className={cn(
            "fixed top-0 left-0 right-0 z-20 p-4 border-b transition-colors duration-300",
            isScrolled 
                ? "bg-primary text-primary-foreground border-transparent" 
                : "bg-background text-foreground border-transparent"
        )}>
            <div className="container mx-auto flex items-center justify-between relative z-10">
                 <div className="flex items-center gap-2">
                     <Button asChild size="lg" className="hidden sm:inline-flex text-base lg:text-lg" variant={isScrolled ? "accent" : "default"}>
                        <Link href="/auth/login">الدخول للنظام</Link>
                    </Button>
                     <div className="md:hidden">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right">
                                <SheetHeader className="p-4 border-b text-right">
                                    <SheetTitle>القائمة</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col h-full">
                                    <div className="flex flex-col gap-4 p-4 flex-grow">
                                        {menuItems.map(item => (
                                            <button key={item.label} onClick={() => scrollToSection(item.section)} className="text-base font-semibold hover:text-primary transition-colors text-right">
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t">
                                        <Button asChild className="w-full">
                                            <Link href="/auth/login">الدخول للنظام</Link>
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
                 <nav className="hidden md:flex items-center justify-center gap-8">
                    {menuItems.map(item => (
                        <button key={item.label} onClick={() => scrollToSection(item.section)} className="text-base lg:text-lg font-bold hover:text-primary transition-colors">
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ y: [0, -5, 0], rotate: [0, 5, 0], }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", }}
                    >
                        <Rocket className="h-6 w-6 sm:h-8 sm:w-8" />
                    </motion.div>
                     <AnimatePresence>
                         {showTitle && (
                            <motion.h1 
                                className="text-xl sm:text-2xl font-bold"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.3 }}
                            >
                                Mudarib
                            </motion.h1>
                         )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

// ... (rest of the file is the same)
