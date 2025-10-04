
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
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';


export const LandingHeader = ({ showTitle, isScrolled }: { showTitle: boolean, isScrolled: boolean }) => {
    const router = useRouter();
    const { refreshUser } = useAuth();

    const menuItems = [
        { label: 'خدماتنا', section: 'servicesSection' },
        { label: 'من نحن', section: 'aboutUs' },
        { label: 'إدارة الديون', section: 'debtsManagement' },
        { label: 'الأسئلة الشائعة', section: 'faqSection' },
    ];

    const scrollToSection = (sectionId: string) => {
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

const FeatureCard = ({ feature, reverse = false, layout = 'default', className, interactiveContentKey }: { feature?: LandingPageFeature, reverse?: boolean, layout?: 'default' | 'banner' | 'overlay', className?: string, interactiveContentKey?: 'smartTickets' | 'sourceAuditing' | 'financialManagement' }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const contentY = useTransform(scrollYProgress, [0, 1], ['20%', '-20%']);
    const imageY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

    if (!feature || !feature.title) return null;
    
    const interactiveContentMap = {
        smartTickets: { text: "تمتع بسرعة فائقة في إدخال التذاكر مع نظامنا الذكي الذي يقرأ ملفات PDF ويستخرج البيانات تلقائيًا.", buttonText: "ابدأ الآن" },
        sourceAuditing: { text: "قارن بين كشوفات حساباتك وحسابات الموردين بدقة وسرعة لا مثيل لها، واكتشف الفروقات تلقائياً.", buttonText: "جرب الآن" },
        financialManagement: { text: "نظام محاسبي متكامل يمنحك رؤية شاملة لجميع العمليات المالية، من القيود اليومية إلى التقارير الختامية.", buttonText: "استكشف الميزات" },
    };
    
    const interactiveContent = interactiveContentKey ? interactiveContentMap[interactiveContentKey] : null;


    const cardVariants = {
        hidden: { opacity: 0, x: reverse ? 100 : -100, y: 0 },
        visible: { 
            opacity: 1, 
            x: 0,
            y: 0,
            transition: { 
                duration: 0.8,
                ease: "easeOut",
                staggerChildren: 0.2
            } 
        },
    };
    
    const contentVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };
    
    if (layout === 'banner') {
        return (
             <motion.div
                ref={ref}
                className={cn("relative min-h-[560px] w-full rounded-2xl overflow-hidden flex items-center group", className)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={cardVariants}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div className="absolute inset-0 z-0" style={{ y: imageY }}>
                     <Image 
                        src={feature.imageUrl || 'https://placehold.co/1200x400.png'} 
                        alt={feature.title} 
                        fill
                        quality={100}
                        sizes="100vw"
                        className="object-cover"
                    />
                </motion.div>
                 
                <motion.div style={{ y: contentY }} className="relative z-10 p-8 md:p-12 max-w-2xl text-white text-right">
                    <motion.h3 variants={contentVariants} className="text-4xl font-extrabold">{feature.title}</motion.h3>
                    <motion.p variants={contentVariants} className="mt-4 text-lg text-white/90 leading-relaxed">{feature.description}</motion.p>
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-6"
                     >
                        <Button asChild className="bg-accent hover:bg-accent/90 text-lg px-8 py-6">
                            <Link href="/auth/login">
                                ابدأ حملتك الآن
                            </Link>
                        </Button>
                    </motion.div>
                </motion.div>
            </motion.div>
        )
    }
    
     if (layout === 'overlay') {
        return (
             <motion.div
                ref={ref}
                className={cn("relative min-h-[300px] w-full rounded-2xl overflow-hidden flex flex-col justify-end p-6 text-white group", className)}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
             >
                <Image 
                    src={feature.imageUrl || 'https://placehold.co/600x400.png'} 
                    alt={feature.title} 
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-0"></div>
                <div className="relative z-10 text-right">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    {feature.description && <p className="mt-1 text-white/90">{feature.description}</p>}
                </div>
            </motion.div>
        );
    }


    return (
        <motion.div
            ref={ref}
            className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center group p-4", className)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={cardVariants}
        >
            <motion.div 
                className={`relative h-80 sm:h-96 rounded-2xl overflow-hidden shadow-lg ${reverse ? 'md:order-last' : ''}`}
                style={{ y: imageY }}
            >
                <Image 
                    src={feature.imageUrl || 'https://placehold.co/800x600.png'} 
                    alt={feature.title} 
                    fill
                    quality={100}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <AnimatePresence>
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6 text-white text-right"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1, transition: { delay: 0.5, duration: 0.5 } }}
                        viewport={{ once: true, amount: 0.5 }}
                        exit={{ opacity: 0 }}
                    >
                        {interactiveContent && (
                            <>
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7, duration: 0.4 }}
                                    className="mb-4"
                                >
                                    {interactiveContent.text}
                                </motion.p>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9, duration: 0.4 }}
                                >
                                    <Button asChild className="bg-accent hover:bg-accent/90">
                                        <Link href="/auth/login">{interactiveContent.buttonText}</Link>
                                    </Button>
                                </motion.div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
            <motion.div className="space-y-4 text-right" style={{ y: contentY }}>
                <motion.h3 variants={contentVariants} className="text-3xl font-bold">{feature.title}</motion.h3>
                <motion.p variants={contentVariants} className="text-muted-foreground leading-relaxed">{feature.description}</motion.p>
                <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    variants={contentVariants}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: interactiveContent ? 0 : 1, y: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                >
                    <Button asChild variant="link" className="p-0 text-primary">
                        <Link href="/auth/login">
                           اعرف المزيد <ArrowLeft className="h-4 w-4 mr-2" />
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

const PartnersCarousel = ({ section }: { section?: { title: string; description: string; partners: LandingPagePartner[] } }) => {
    if (!section || !section.partners || section.partners.length === 0) return null;

    return (
        <div id="partnersSection" className="text-center py-16">
            <div className="inline-block px-8 py-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-lg mb-4">
                <h2 className="text-3xl font-bold">{section.title}</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">{section.description}</p>
            <Carousel
                opts={{ align: "start", loop: true, direction: "rtl" }}
                plugins={[Autoplay({ delay: 2000, stopOnInteraction: false })]}
                className="w-full max-w-6xl mx-auto"
            >
                <CarouselContent className="-mr-4">
                    {section.partners.map((partner, index) => (
                        <CarouselItem key={index} className="pr-4 basis-1/2 sm:basis-1/3 lg:basis-1/5">
                             <Card className="bg-white dark:bg-gray-800/50 border h-32 flex items-center justify-center p-4">
                                <div className="relative w-full h-full">
                                     <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain" quality={100} sizes="30vw" />
                                </div>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    );
};

const FaqSection = ({ section }: { section?: { title: string; description: string; faqs: LandingPageFaqItem[] } }) => {
    if (!section || !section.faqs || section.faqs.length === 0) return null;

    return (
        <motion.div 
            id="faqSection" 
            className="py-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
        >
            <div className="text-center mb-12">
                 <div className="inline-block px-8 py-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-lg mb-4">
                    <h2 className="text-3xl font-bold">{section.title}</h2>
                </div>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">{section.description}</p>
            </div>
             <div className="w-full max-w-3xl mx-auto space-y-2">
                {section.faqs.map((faq, index) => (
                     <div key={index} className="bg-white dark:bg-gray-800/50 border rounded-lg mb-2 px-4">
                        <h3 className="text-lg font-semibold py-4">{faq.question}</h3>
                        <p className="pb-4 pt-0 text-muted-foreground">{faq.answer}</p>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

const InfoCard = ({ icon: Icon, title, description, className, layout = 'default', imageUrl }: { icon?: LucideIcon, title: string, description?: string, className?: string, layout?: 'default' | 'overlay' | 'feature', imageUrl?: string }) => {
    if (layout === 'feature') {
        return (
            <div className="flex flex-col items-center text-center p-6 bg-primary-foreground/5 dark:bg-primary-foreground/10 rounded-xl border border-transparent transition-all duration-300 hover:border-primary/20 hover:-translate-y-2">
                <div className="p-4 bg-accent/20 rounded-full mb-4">
                    {Icon && <Icon className="h-8 w-8 text-accent" />}
                </div>
                <h3 className="text-xl font-bold mb-2 text-primary-foreground">{title}</h3>
                <p className="text-primary-foreground/80">{description}</p>
            </div>
        );
    }
    
     if (layout === 'overlay') {
        return (
             <motion.div
                className={cn("relative min-h-[300px] w-full rounded-2xl overflow-hidden flex flex-col justify-end p-6 text-white group", className)}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
             >
                <Image 
                    src={imageUrl || 'https://placehold.co/600x400.png'} 
                    alt={title} 
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-0"></div>
                <div className="relative z-10 text-right">
                    <h3 className="text-2xl font-bold">{title}</h3>
                    {description && <p className="mt-1 text-white/90">{description}</p>}
                </div>
            </motion.div>
        );
    }
    
    return (
        <motion.div
            className={cn("p-8 rounded-2xl bg-white dark:bg-gray-800/50 border text-right", className)}
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ duration: 0.3 }}
        >
            {Icon && <Icon className="h-10 w-10 text-primary mb-4" />}
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            {description && <p className="text-muted-foreground">{description}</p>}
        </motion.div>
    );
};

const ServicesCarousel = ({ section }: { section?: { title: string, description: string }}) => {
    if (!section) return null;

    const services = [
        { icon: Ticket, title: 'حجوزات طيران', description: 'إدارة شاملة لحجوزات الطيران من الإصدار إلى التعديل والاسترجاع.' },
        { icon: CreditCard, title: 'إصدار فيزا', description: 'نظام متكامل لتتبع طلبات الفيزا ومراحل إنجازها بدقة.' },
        { icon: BedDouble, title: 'حجوزات فندقية', description: 'قريبًا: إدارة حجوزات الفنادق والبرامج السياحية.' },
        { icon: Users, title: 'إدارة الكروبات', description: 'تنظيم وإدارة المجموعات السياحية بكل سهولة (قريبًا).' },
    ];
    
    return (
        <div id="servicesSection" className="py-20 text-center">
            <div className="inline-block px-8 py-3 bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-lg mb-4">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{section.title}</h2>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">{section.description}</p>
            <Carousel
                opts={{ align: "start", loop: true, direction: 'rtl' }}
                plugins={[Autoplay({ delay: 2000, stopOnInteraction: false })]}
                className="w-full max-w-6xl mx-auto"
            >
                <CarouselContent className="-mr-4">
                    {services.map((service, index) => (
                        <CarouselItem key={index} className="pr-4 basis-full sm:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                               <InfoCard {...service} />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    );
};

const WhatsAppMarketingSection = () => {
  const marketingFeatures = [
    {
      icon: Send,
      title: 'إرسال للمجموعات',
      description: 'إرسال رسائل المجموعات متعددة دفعة واحدة بسهولة وسرعة.',
    },
    {
      icon: FileText,
      title: 'قوالب رسائل',
      description: 'إنشاء وحفظ قوالب رسائل مخصصة لاستخدامها في الإعلانات.',
    },
    {
      icon: Zap,
      title: 'سرعة وكفاءة',
      description: 'إرسال آلاف الرسائل بسرعة وكفاءة عالية وبضغطة زر واحدة.',
    },
  ];
  return (
    <div id="whatsappMarketing" className="w-full bg-[#23005a] text-white py-20 px-4 md:px-0">
        <div className="container mx-auto text-center">
             <Badge variant="outline" className="bg-white/10 text-white border-white/20 mb-4 text-sm">
                ابدأ الآن مع نظام إدارة إعلانات الواتساب
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                أرسل إعلاناتك لآلاف العملاء
                <br/>
                بضغطة زر واحدة
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto mt-6">
                نظام متكامل لإدارة الإعلانات والرسائل عبر الواتساب بطريقة احترافية وفعالة، يتيح لك إرسال رسائل جماعية للمجموعات وجهات الاتصال بسهولة تامة.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                 {marketingFeatures.map((feature, index) => (
                    <InfoCard key={index} {...feature} layout="feature" />
                ))}
            </div>
             <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
                 <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 w-full sm:w-auto">
                    <Link href="#">تواصل معنا الآن</Link>
                </Button>
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 w-full sm:w-auto">
                    <Link href="#">اكتشف المزيد</Link>
                </Button>
            </div>
        </div>
    </div>
  );
};


const DebtsManagementSection = ({ section }: { section?: { title: string, description: string, imageUrl: string }}) => {
    if (!section) return null;
    return (
        <div id="debtsManagement" className="w-full bg-[#f0f2f5] dark:bg-gray-900 py-20 px-4 md:px-0">
            <div className="container mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="relative h-96 md:h-[450px]">
                        <Image src={section.imageUrl || 'https://placehold.co/800x600.png'} data-ai-hint="finance management" alt="Debt Management" fill className="object-cover rounded-2xl" />
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                            ميزة خاصة
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight my-4">
                           {section.title || 'نظام إدارة ومتابعة الديون'}
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                           {section.description || 'تابع ديون العملاء والشركات بدقة، واحصل على تقارير مفصلة، وقم بتسوية الحسابات بسهولة لضمان استقرار التدفقات النقدية.'}
                        </p>
                        <div className="space-y-4 text-right mb-8">
                             <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-blue-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">كشوفات حسابات تفصيلية</h4> <p className="text-muted-foreground">عرض حركات المدين والدائن لكل حساب</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-blue-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">تنبيهات آلية للمدفوعات</h4> <p className="text-muted-foreground">احصل على إشعارات بمواعيد الأقساط والديون المستحقة</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-blue-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">تقارير أعمار الديون</h4> <p className="text-muted-foreground">حلل ديونك لمعرفة الديون المتعثرة والقديمة</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-blue-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">سهولة التسوية والمطابقة</h4> <p className="text-muted-foreground">أدوات لتسوية الحسابات مع العملاء والموردين</p> </div></div>
                        </div>
                        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 w-full sm:w-auto">
                            <Link href="/reports/debts">عرض تقرير الأرصدة <ArrowLeft className="h-4 w-4 mr-2" /></Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfitsManagementSection = ({ section }: { section?: { title: string, description: string, imageUrl: string }}) => {
    if (!section) return null;
    return (
        <div id="profitsManagement" className="w-full bg-[#f0f2f5] dark:bg-gray-900 py-20 px-4 md:px-0">
            <div className="container mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                     <div className="text-right md:order-2">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                            تحليل متقدم
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight my-4">
                           {section.title || 'نظام التحليل المالي وإدارة الأرباح'}
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                           {section.description || 'احصل على رؤية عميقة لأداء شركتك المالي. تتبع الأرباح، حلل التكاليف، وادرس هيكل حساباتك بسهولة عبر شجرة الحسابات التفاعلية.'}
                        </p>
                        <div className="space-y-4 text-right mb-8">
                             <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-green-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">شجرة حسابات تفاعلية</h4> <p className="text-muted-foreground">عرض هرمي لجميع حساباتك مع الأرصدة المدينة والدائنة.</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-green-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">تقارير أرباح شاملة</h4> <p className="text-muted-foreground">تقارير مفصلة عن أرباح كل حجز، عميل، ومورد.</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-green-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">تحليل التكاليف والإيرادات</h4> <p className="text-muted-foreground">أدوات لتحليل مصادر الدخل والمصاريف لتحسين الأداء.</p> </div></div>
                            <div className="flex items-start gap-4"><CheckCircle className="h-6 w-6 text-green-500 mt-1 shrink-0" /><div className="text-right"> <h4 className="font-bold">سهولة تتبع الأرباح</h4> <p className="text-muted-foreground">تتبع أرباح الشركات والشركاء في نظام السكمنت.</p> </div></div>
                        </div>
                        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-6 w-full sm:w-auto">
                            <Link href="/settings">استعراض شجرة الحسابات <ArrowLeft className="h-4 w-4 mr-2" /></Link>
                        </Button>
                    </div>
                     <div className="relative h-96 md:h-[450px] md:order-1">
                        <Image src={section.imageUrl || 'https://placehold.co/800x600.png'} data-ai-hint="accounting chart" alt="Profits Management" fill className="object-cover rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Preloader = () => (
    <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#23005a] overflow-hidden"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
    >
        <Network className="absolute inset-0 h-full w-full text-white/10 opacity-20 blur-sm" />
        <motion.div
            animate={{
                scale: [1, 1.1, 1],
                y: [0, -10, 0]
            }}
            transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        >
            <Rocket className="h-20 w-20 text-white/80" />
        </motion.div>
    </motion.div>
);


const landingPageSettings: Partial<LandingPageSettings> = {
    heroTitle: 'نظام Mudarib المحاسبي',
    heroSubtitle: 'الحل المتكامل لإدارة شركات السفر والسياحة بكفاءة ودقة.',
    heroSubtitleColor: '#52525b', // zinc-600
    heroTitleColor: '#1e293b',
    smartTickets: {
        title: 'إدارة حجوزات التذاكر الذكية',
        description: 'أتمتة إدخال بيانات التذاكر وتدقيقها.',
        imageUrl: 'https://images.unsplash.com/photo-1517999348311-5bc38e05b1c6?q=80&w=2070&auto=format&fit=crop',
    },
    sourceAuditing: {
        title: 'إدارة التدقيق الذكي للمصادر',
        description: 'مطابقة آلية لكشوفات الحسابات مع الموردين.',
        imageUrl: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop',
    },
    financialManagement: {
        title: 'إدارة الحسابات المالية للشركات',
        description: 'نظام محاسبي متكامل يغطي جميع الجوانب المالية.',
        imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop',
    },
     servicesSection: {
        title: 'خدماتنا المحاسبية',
        description: 'نظام متكامل يغطي جميع احتياجات شركات السياحة والسفر، مصمم خصيصًا ليتوافق مع طبيعة عملكم.'
    },
    partnersSection: {
        title: 'شركاء النجاح',
        description: 'نفخر بالتعاون مع نخبة من شركات السياحة والسفر الرائدة التي وثقت في نظامنا لتحقيق أهدافها.',
        partners: [
            { name: 'السندباد', logoUrl: 'https://assets.sindibad.iq/_nuxt/sindibad-logo.TpiIXwtL.png' },
            { name: 'رايد فلاي', logoUrl: 'https://ridefly.com/static/media/ridefly_name_logo.bc891a58a13a8b8c7837.png' },
            { name: 'fly4all', logoUrl: 'https://fly4all.com/_next/image?url=%2Flogo%2Ffly4all%2Fheader.webp&w=384&q=75' },
            { name: 'الروضتين نجف', logoUrl: 'https://alrawdataintravel.com/_next/image?url=%2Flogo%2Froda10%2Fheader.webp&w=384&q=75' },
            { name: 'فلاي وي', logoUrl: 'https://flyway.travel/_next/image?url=%2Flogo%2Fflyway%2Ffooter.webp&w=256&q=75' },
        ],
    },
    faqSection: {
        title: 'الأسئلة الشائعة',
        description: 'هل لديك سؤال؟ قد تجد إجابتك هنا.',
        faqs: [
            { question: 'ما هو نظام Mudarib؟', answer: 'هو نظام محاسبي متكامل مصمم خصيصًا لشركات السياحة والسفر.' },
            { question: 'هل يدعم النظام اللغة العربية؟', answer: 'نعم، النظام يدعم اللغة العربية بشكل كامل مع واجهات RTL.' },
            { question: 'هل يمكن تخصيص مظهر النظام؟', answer: 'بالتأكيد، يمكنك تخصيص الألوان والخطوط والشعارات من صفحة الإعدادات.' },
        ],
    },
     accountStatements: {
        title: 'إدارة ومتابعة الديون بسهولة',
        description: 'نظام متكامل لمتابعة ديون العملاء والموردين، مع كشوفات حسابات تفصيلية وتنبيهات آلية للمدفوعات المستحقة.',
        imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1974&auto=format&fit=crop',
    },
    financialAnalysis: {
        title: 'تحليلات مالية دقيقة لاتخاذ القرارات',
        description: 'احصل على رؤية عميقة لأداء شركتك المالي. تتبع الأرباح، حلل التكاليف، وادرس هيكل حساباتك بسهولة عبر شجرة الحسابات التفاعلية.',
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    },
    footerImageUrl: 'https://images.unsplash.com/photo-1549492423-400259a5e5a4?q=80&w=2148&auto=format&fit=crop',
};

const sidebarSettings: Partial<SidebarThemeSettings> = {
    landingImageUrl: 'https://d3x4b1wy4qlu9.cloudfront.net/videos/hero/hero-analyze.mp4'
}

const LandingPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [showTitle, setShowTitle] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const heroRef = React.useRef<HTMLElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsLoading(false), 1500); // Simulate loading time
        
        const handleScroll = () => {
            if (heroRef.current) {
                const { bottom } = heroRef.current.getBoundingClientRect();
                setShowTitle(bottom > 80);
                setIsScrolled(window.scrollY > heroRef.current.offsetHeight - 80);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    if (!isMounted) {
        return <Preloader />;
    }

    return (
        <main className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-slate-200">
            <AnimatePresence>
                {isLoading && <Preloader />}
            </AnimatePresence>
            
            <AnimatePresence>
                {!isLoading && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <LandingHeader 
                            showTitle={showTitle} 
                            isScrolled={isScrolled}
                        />
                        <motion.section
                            ref={heroRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative w-full overflow-hidden"
                        >
                            <div className="container mx-auto min-h-screen flex flex-col justify-center items-center text-center relative z-10 pt-24 md:pt-32 pb-16 md:pb-24">
                                <motion.h1 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className={cn(
                                        "text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight"
                                    )}
                                    style={{ color: landingPageSettings.heroTitleColor }}
                                >
                                {landingPageSettings.heroTitle}
                                </motion.h1>
                                <motion.p 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                    className="mt-4 max-w-2xl mx-auto text-lg md:text-xl"
                                    style={{ 
                                        color: landingPageSettings.heroSubtitleColor,
                                    }}
                                >
                                {landingPageSettings.heroSubtitle}
                                </motion.p>
                                
                                 <motion.div 
                                    className="relative mt-12 md:mt-24 w-full max-w-7xl aspect-[16/9] md:aspect-[16/7]"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.9 }}
                                  >
                                    <div className="relative rounded-t-lg bg-slate-100/60 p-2 ring-1 ring-black/10 backdrop-blur-sm h-full w-full">
                                        {sidebarSettings.landingImageUrl && sidebarSettings.landingImageUrl.endsWith('.mp4') ? (
                                            <video
                                                src={sidebarSettings.landingImageUrl}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="rounded-t-md h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Image
                                                src={sidebarSettings.landingImageUrl || 'https://placehold.co/1280x720.png'}
                                                alt="Hero"
                                                layout="fill"
                                                objectFit="cover"
                                                className="rounded-t-md"
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-50 dark:from-gray-950 to-transparent pointer-events-none" />
                        </motion.section>

                        <div className="container mx-auto pt-8 md:pt-16 space-y-16 md:space-y-20">
                            <FeatureCard 
                                feature={landingPageSettings.smartTickets} 
                                reverse={false} 
                                interactiveContentKey="smartTickets"
                            />
                            <FeatureCard 
                                feature={landingPageSettings.sourceAuditing} 
                                reverse={true} 
                                interactiveContentKey="sourceAuditing"
                            />
                            <FeatureCard 
                                feature={landingPageSettings.financialManagement} 
                                reverse={false} 
                                interactiveContentKey="financialManagement"
                            />
                            
                            <ServicesCarousel section={landingPageSettings.servicesSection} />
                        </div>
                        
                        <WhatsAppMarketingSection />
                        <DebtsManagementSection section={landingPageSettings.accountStatements} />
                        <ProfitsManagementSection section={landingPageSettings.financialAnalysis} />
                        
                        <div className="container mx-auto pt-16 space-y-20">
                            <FaqSection section={landingPageSettings.faqSection} />

                            <PartnersCarousel section={landingPageSettings.partnersSection} />
                        </div>

                        <footer className="mt-20 relative h-80 w-full bg-white dark:bg-gray-800/50">
                             {landingPageSettings.footerImageUrl && (
                                 <Image src={landingPageSettings.footerImageUrl} alt="Footer background" fill className="object-cover opacity-10" />
                             )}
                            <div className="container mx-auto relative z-10 flex flex-col items-center justify-center h-full text-center">
                                <h2 className="text-3xl font-bold">{landingPageSettings.heroTitle}</h2>
                                <p className="mt-2 text-muted-foreground">نظامك المحاسبي الأمثل لقطاع السياحة والسفر</p>
                                <p className="mt-8 text-sm text-muted-foreground/60">&copy; {new Date().getFullYear()} {landingPageSettings.heroTitle}. جميع الحقوق محفوظة.</p>
                            </div>
                        </footer>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
};

export default LandingPage;

    