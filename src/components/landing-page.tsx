
"use client";

import React, { useEffect, useState, useRef } from 'react';
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
import type { LandingPageSettings, LandingPageFeature, LandingPageFaqItem, LandingPagePartner } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const Section = ({ id, className, ...props }: { id: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <section id={id} className={cn("container mx-auto py-16 sm:py-20 md:py-24", className)} {...props} />
);

export const LandingHeader = ({ showTitle, isScrolled, settings }: { showTitle: boolean, isScrolled: boolean, settings: LandingPageSettings }) => {
    const router = useRouter();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const menuItems = [
        { label: settings.servicesSection?.title, section: 'servicesSection' },
        { label: settings.partnersSection?.title, section: 'partnersSection' },
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
            "fixed top-0 left-0 right-0 z-50 p-4 border-b transition-colors duration-300",
            isScrolled 
                ? "bg-primary text-primary-foreground border-transparent" 
                : "bg-background/80 backdrop-blur-sm text-foreground border-border"
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

const FeatureCard = ({ icon: Icon, title, description, className }: { icon: LucideIcon, title: string, description: string, className?: string }) => (
    <Card className={cn("text-center p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300", className)}>
        <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full border-4 border-primary/20">
                <Icon className="h-10 w-10 text-primary" />
            </div>
        </div>
        <CardTitle className="text-xl mb-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
    </Card>
);

const FeatureShowcase = ({ feature, reverse = false }: { feature: LandingPageFeature, reverse?: boolean }) => {
    return (
        <div className={cn("grid md:grid-cols-2 gap-8 md:gap-12 items-center", reverse && "md:grid-cols-[1fr,1.2fr]")}>
            <motion.div 
                className={cn("text-right", reverse ? "md:order-2" : "")}
                initial={{ opacity: 0, x: reverse ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6 }}
            >
                <Badge variant="outline" className="mb-4 text-base">حصريًا</Badge>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground">{feature.title}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
            <motion.div 
                className={cn("relative aspect-video rounded-2xl overflow-hidden shadow-2xl", reverse ? "md:order-1" : "")}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6 }}
            >
                <Image src={feature.imageUrl} alt={feature.title} layout="fill" objectFit="cover" />
            </motion.div>
        </div>
    );
};


export function LandingPage({ settings }: { settings: LandingPageSettings }) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const heroTitleStyle = { color: settings.heroTitleColor || 'hsl(var(--foreground))' };
    const heroSubtitleStyle = { color: settings.heroSubtitleColor || 'hsl(var(--muted-foreground))' };

    return (
        <div className="bg-background text-foreground" dir="rtl">
            <LandingHeader showTitle={isScrolled} isScrolled={isScrolled} settings={settings} />

            <main>
                <Section id="hero" className="min-h-screen flex items-center justify-center text-center !py-0">
                    <div className="relative z-10 space-y-6">
                        <motion.h1
                            className="text-5xl md:text-7xl font-black tracking-tighter"
                            style={heroTitleStyle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                        >
                            {settings.heroTitle}
                        </motion.h1>
                        <motion.p
                            className="max-w-2xl mx-auto text-lg md:text-xl font-medium"
                            style={heroSubtitleStyle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.4 }}
                        >
                            {settings.heroSubtitle}
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.6 }}
                        >
                            <Button asChild size="lg" className="text-lg">
                                <Link href="/auth/login">ابدأ الآن <ArrowLeft className="mr-2 h-5 w-5" /></Link>
                            </Button>
                        </motion.div>
                    </div>
                </Section>
                
                 <Section id="servicesSection" className="bg-muted">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold">{settings.servicesSection?.title}</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{settings.servicesSection?.description}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard icon={Zap} title="إدخال ذكي وسريع" description="استيراد بيانات التذاكر والفيزا والفواتير من ملفات PDF بضغطة زر." />
                        <FeatureCard icon={BarChart2} title="تقارير وتحليلات دقيقة" description="كشوفات حسابات مفصلة، تقارير أرباح، وتحليلات متقدمة لدعم اتخاذ القرار." />
                        <FeatureCard icon={ShieldCheck} title="تدقيق ومطابقة آلية" description="أدوات ذكية لمطابقة الكشوفات بينك وبين الموردين وكشف الفروقات بسهولة." />
                    </div>
                </Section>

                <Section id="features" className="space-y-24">
                    <FeatureShowcase feature={settings.smartTickets} />
                    <FeatureShowcase feature={settings.accountStatements} reverse={true} />
                    <FeatureShowcase feature={settings.financialAnalysis} />
                </Section>

                <Section id="partnersSection" className="bg-muted">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold">{settings.partnersSection?.title}</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{settings.partnersSection?.description}</p>
                    </div>
                    <Carousel
                        opts={{ align: "start", loop: true }}
                        plugins={[Autoplay({ delay: 3000 })]}
                        className="w-full"
                    >
                        <CarouselContent>
                            {settings.partnersSection?.partners.map((partner, index) => (
                                <CarouselItem key={index} className="md:basis-1/3 lg:basis-1/5">
                                    <div className="p-1">
                                        <Card className="flex items-center justify-center p-6 h-32 bg-background">
                                            <Image src={partner.logoUrl} alt={partner.name} width={120} height={40} className="object-contain" />
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </Section>
                
                 <Section id="faqSection">
                    <div className="text-center mb-12">
                         <h2 className="text-3xl md:text-4xl font-extrabold">{settings.faqSection?.title}</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{settings.faqSection?.description}</p>
                    </div>
                     <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                        {(settings.faqSection?.faqs || []).map((faq, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-lg font-semibold text-right">{faq.question}</AccordionTrigger>
                                <AccordionContent className="text-base text-muted-foreground text-right">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </Section>
            </main>

            <footer className="relative py-20 bg-primary/10 text-center mt-16 overflow-hidden">
                <Image src={settings.footerImageUrl} alt="Footer background" layout="fill" objectFit="cover" className="opacity-10" />
                <div className="container mx-auto relative z-10">
                     <h2 className="text-4xl font-black tracking-tighter">هل أنت جاهز لتبسيط محاسبة شركتك؟</h2>
                    <p className="mt-4 text-lg max-w-xl mx-auto">
                        انضم إلى الشركات الرائدة التي تستخدم نظام Mudarib لتحقيق أفضل النتائج.
                    </p>
                    <Button asChild size="lg" className="mt-8 text-lg">
                        <Link href="/auth/login">ابدأ تجربتك الآن <ArrowLeft className="mr-2 h-5 w-5" /></Link>
                    </Button>
                </div>
            </footer>
             <div className="py-6 border-t bg-muted">
                <div className="container mx-auto text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Mudarib. كل الحقوق محفوظة.</p>
                </div>
            </div>
        </div>
    );
}
