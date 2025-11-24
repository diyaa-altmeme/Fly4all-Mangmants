
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Rocket, LineChart, ShieldCheck, Repeat, LucideIcon, Menu, Sun, Moon, Zap, Smartphone, HelpCircle, Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import type { LandingPageSettings } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';


const LandingHeader = ({ isScrolled }: { isScrolled: boolean }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { t, locale, toggleLocale } = useTranslation();

    const menuItems = [
        { key: 'features', section: 'features' },
        { key: 'howItWorks', section: 'how-it-works' },
        { key: 'testimonials', section: 'testimonials' },
        { key: 'pricing', section: 'pricing' },
    ] as const;

    const scrollToSection = (sectionId: string) => {
        setIsSheetOpen(false);
        const element = document.getElementById(sectionId);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    };

    const languageLabel = locale === 'ar' ? t('common.language.shortEn') : t('common.language.shortAr');

    return (
        <header className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            isScrolled ? "bg-background/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm" : "bg-transparent"
        )} id="header">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                 <Link href="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                        <Rocket/>
                    </div>
                    <span className="text-xl font-bold">{t('common.brandName')}</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {menuItems.map(item => (
                        <button key={item.key} onClick={() => scrollToSection(item.section)} className="font-medium hover:text-primary transition-colors">
                            {t(`landing.header.menuItems.${item.key}`)}
                        </button>
                    ))}
                </nav>

                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={toggleLocale} className="hidden sm:inline-flex">
                        {languageLabel}
                    </Button>
                    <Button asChild>
                        <Link href="/login">
                           {t('common.login')}
                        </Link>
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                    <div className="md:hidden">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right">
                                <SheetHeader className="text-right p-4 border-b">
                                    <SheetTitle>{t('common.menu')}</SheetTitle>
                                </SheetHeader>
                                <nav className="flex flex-col p-4 space-y-4">
                                     {menuItems.map(item => (
                                        <button key={item.key} onClick={() => scrollToSection(item.section)} className="font-medium hover:text-primary transition-colors text-right py-2 border-b">
                                            {t(`landing.header.menuItems.${item.key}`)}
                                        </button>
                                    ))}
                                    <Button variant="outline" onClick={toggleLocale}>
                                        {languageLabel}
                                    </Button>
                                    <Button asChild className="mt-2">
                                       <Link href="/login">
                                         {t('common.login')}
                                       </Link>
                                    </Button>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
};


const FeatureCard = ({ icon: Icon, title, description }: { icon: LucideIcon, title: string, description: string }) => (
    <div className="feature-card bg-card text-card-foreground rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
            <Icon className="feature-icon h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-muted-foreground">
            {description}
        </p>
    </div>
);

const featureIconMap: Record<string, LucideIcon> = {
    smartInput: Zap,
    analytics: LineChart,
    reconciliation: ShieldCheck,
    sync: Repeat,
    mobile: Smartphone,
    support: HelpCircle,
};

const StepCard = ({ number, title, description, imageUrl }: { number: number, title: string, description: string, imageUrl: string }) => (
    <div className="relative">
        <div className="flex flex-col items-center text-center p-6 bg-card text-card-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 h-full">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary text-2xl font-bold">
                {number}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground mb-4 flex-grow">
                {description}
            </p>
            <div className="mt-auto w-full aspect-video relative rounded-lg overflow-hidden">
                <Image src={imageUrl} alt={title} fill className="object-cover" />
            </div>
        </div>
    </div>
);


export function LandingPage({ settings }: { settings: LandingPageSettings }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const { t, tm } = useTranslation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const heroSettings = settings || {};
    const featuresHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.features.heading');
    const features = tm<Array<{ key: string; title: string; description: string }>>('landing.features.items');
    const howItWorksHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.howItWorks.heading');
    const howItWorksSteps = tm<Array<{ key: string; title: string; description: string; imageUrl: string }>>('landing.howItWorks.steps');
    const testimonialsHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.testimonials.heading');
    const testimonials = tm<Array<{ key: string; name: string; role: string; quote: string }>>('landing.testimonials.items');
    const pricingHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.pricing.heading');
    const pricingPlans = tm<Array<{ key: string; name: string; description: string; price: string; priceSuffix?: string; features: string[]; badge?: string; cta: string }>>('landing.pricing.plans');
    const partnersHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.partners.heading');
    const faqHeading = tm<{ prefix: string; highlight: string; suffix: string }>('landing.faq.heading');
    const currentYear = new Date().getFullYear();
    const quickLinks = [
        { href: '#', label: t('landing.footer.quickLinks.links.home') },
        { href: '#features', label: t('landing.footer.quickLinks.links.features') },
        { href: '#how-it-works', label: t('landing.footer.quickLinks.links.howItWorks') },
        { href: '#pricing', label: t('landing.footer.quickLinks.links.pricing') },
        { href: '/login', label: t('landing.footer.quickLinks.links.login') },
    ];
    const companyLinks = [
        { href: '#', label: t('landing.footer.company.links.about') },
        { href: '#', label: t('landing.footer.company.links.faq') },
        { href: '#', label: t('landing.footer.company.links.privacy') },
        { href: '#', label: t('landing.footer.company.links.terms') },
        { href: '#', label: t('landing.footer.company.links.contact') },
    ];
    const contactItems = [
        { icon: 'fas fa-map-marker-alt', label: t('landing.footer.contact.addressLabel'), value: t('common.contact.location') },
        { icon: 'fas fa-phone-alt', label: t('landing.footer.contact.phoneLabel'), value: t('common.contact.phone') },
        { icon: 'fas fa-envelope', label: t('landing.footer.contact.emailLabel'), value: t('common.contact.email') },
    ];

    return (
        <div className="bg-background text-foreground">
            <LandingHeader isScrolled={isScrolled} />
            
            <main>
                <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
                    <div className="absolute inset-0 gradient-bg opacity-10"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20 dark:opacity-10"></div>
                    
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="inline-block px-4 py-2 bg-accent text-accent-foreground rounded-full mb-6">
                                <span className="font-bold flex items-center gap-2 rtl:flex-row-reverse"><Zap className="h-4 w-4" /> {t('landing.header.badge')}</span>
                            </div>
                            
                             <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                                <span className="animated-gradient-text">
                                    {heroSettings.heroTitle}
                                </span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto">
                                {heroSettings.heroSubtitle}
                            </p>
                            
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button asChild size="lg" className="px-8 py-4 text-lg transition-all transform hover:scale-105 shadow-lg shadow-primary/20">
                                    <Link href="/login">
                                        {t('landing.hero.primaryCta')}
                                    </Link>
                                </Button>
                                <Button asChild variant="secondary" size="lg" className="px-8 py-4 text-lg transition-all transform hover:scale-105 shadow-lg">
                                    <a href="#features">{t('landing.hero.secondaryCta')}</a>
                                </Button>
                            </div>
                        </div>
                        
                        <div className="mt-20 relative">
                             <div className="absolute -left-20 -top-20 w-40 h-40 bg-primary rounded-full filter blur-3xl opacity-20 animate-float"></div>
                             <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-secondary rounded-full filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>

                            <div className="relative glass-effect rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                                <Image src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" alt="Dashboard Preview" width={2070} height={1164} className="w-full h-auto" />
                            </div>
                        </div>
                    </div>
                </section>
                
                <section id="features" className="py-20 bg-muted/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                {featuresHeading.prefix} <span className="text-primary">{featuresHeading.highlight}</span>{featuresHeading.suffix ? ` ${featuresHeading.suffix}` : ''}
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('landing.features.description')}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map(feature => {
                                const Icon = featureIconMap[feature.key] ?? Zap;
                                return (
                                    <FeatureCard
                                        key={feature.key}
                                        icon={Icon}
                                        title={feature.title}
                                        description={feature.description}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="py-20">
                     <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">{howItWorksHeading.prefix} <span className="text-primary">{howItWorksHeading.highlight}</span>{howItWorksHeading.suffix ? ` ${howItWorksHeading.suffix}` : ''}</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('landing.howItWorks.description')}
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                           {howItWorksSteps.map((step, index) => (
                               <StepCard
                                   key={step.key}
                                   number={index + 1}
                                   title={step.title}
                                   description={step.description}
                                   imageUrl={step.imageUrl}
                               />
                           ))}
                        </div>
                    </div>
                </section>
                
                <section id="testimonials" className="py-20 bg-muted/50">
                    <div className="container mx-auto px-4">
                         <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">{testimonialsHeading.prefix} <span className="text-primary">{testimonialsHeading.highlight}</span>{testimonialsHeading.suffix ? ` ${testimonialsHeading.suffix}` : ''}</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('landing.testimonials.description')}
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                             {testimonials.map((testimonial, index) => (
                                <Card key={testimonial.key} className="bg-card text-card-foreground">
                                    <CardContent className="p-8">
                                        <div className="flex items-center mb-4 gap-4 rtl:flex-row-reverse">
                                            <Image src={`https://picsum.photos/seed/${index + 1}/40/40`} alt={testimonial.name} width={40} height={40} className="rounded-full" />
                                            <div className="text-start rtl:text-end">
                                                <h4 className="font-bold">{testimonial.name}</h4>
                                                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                            </div>
                                        </div>
                                        <p className="mb-4">“{testimonial.quote}”</p>
                                        <div className="flex items-center text-yellow-500">
                                           <Star/><Star/><Star/><Star/><Star/>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
                

<section id="pricing" className="py-20">
    <div className="container mx-auto px-4">
        <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{pricingHeading.prefix} <span className="text-primary">{pricingHeading.highlight}</span>{pricingHeading.suffix ? ` ${pricingHeading.suffix}` : ''}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('landing.pricing.description')}
            </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
            {pricingPlans.map(plan => {
                const isFeatured = Boolean(plan.badge);
                const priceSize = plan.key === 'professional' ? 'text-6xl' : plan.key === 'enterprise' ? 'text-4xl' : 'text-5xl';
                return (
                    <Card key={plan.key} className={cn('rounded-2xl border-2', isFeatured && 'border-primary shadow-lg scale-105')}>
                        <CardHeader className="text-center">
                            {plan.badge ? <div className="flex justify-center"><Badge>{plan.badge}</Badge></div> : null}
                            <CardTitle className={cn('text-2xl', isFeatured && 'text-3xl text-primary')}>{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className={cn(priceSize, 'font-bold mb-4')}>
                                {plan.price}
                                {plan.priceSuffix ? <span className="text-lg font-normal text-muted-foreground">{plan.priceSuffix}</span> : null}
                            </p>
                            <ul className="space-y-4 text-start rtl:text-end">
                                {plan.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-3 justify-start rtl:flex-row-reverse">
                                        <Check className="text-green-500" /> {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant={isFeatured ? 'default' : 'outline'}>
                                {plan.cta}
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    </div>
</section>

                <section id="partners" className="py-20 bg-muted/50">
                    <div className="container mx-auto px-4">
                         <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">{partnersHeading.prefix} <span className="text-primary">{partnersHeading.highlight}</span>{partnersHeading.suffix ? ` ${partnersHeading.suffix}` : ''}</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('landing.partners.description')}
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
                            {heroSettings.partnersSection?.partners.map((partner, index) => (
                                <div key={index} className="relative h-16 w-32">
                                    <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain grayscale hover:grayscale-0 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-20">
                     <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                             <h2 className="text-3xl md:text-5xl font-bold mb-4">{faqHeading.prefix} <span className="text-primary">{faqHeading.highlight}</span>{faqHeading.suffix ? ` ${faqHeading.suffix}` : ''}</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                {t('landing.faq.description')}
                            </p>
                        </div>
                         <div className="max-w-3xl mx-auto">
                            {heroSettings.faqSection?.faqs.map((faq, index) => (
                                <Card key={index} className="mb-4">
                                    <CardHeader className="cursor-pointer">
                                        <CardTitle className="text-lg">{faq.question}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{faq.answer}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
                
                 
<footer className="bg-gray-900 text-gray-300 py-12">
    <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
                <div className="flex items-center gap-2 mb-4 rtl:flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                        <Rocket/>
                    </div>
                    <span className="text-xl font-bold text-white">{t('common.brandName')}</span>
                </div>
                <p className="mb-4">
                    {t('landing.footer.description')}
                </p>
                <div className="flex gap-4">
                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label={t('landing.footer.social.twitter')}>
                        <i className="fab fa-twitter"></i>
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label={t('landing.footer.social.facebook')}>
                        <i className="fab fa-facebook-f"></i>
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label={t('landing.footer.social.linkedin')}>
                        <i className="fab fa-linkedin-in"></i>
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors" aria-label={t('landing.footer.social.instagram')}>
                        <i className="fab fa-instagram"></i>
                    </a>
                </div>
            </div>

            <div>
                <h4 className="text-lg font-bold text-white mb-4">{t('landing.footer.quickLinks.title')}</h4>
                <ul className="space-y-3">
                    {quickLinks.map(link => (
                        <li key={link.href}><a href={link.href} className="hover:text-white transition-colors">{link.label}</a></li>
                    ))}
                </ul>
            </div>

            <div>
                <h4 className="text-lg font-bold text-white mb-4">{t('landing.footer.company.title')}</h4>
                <ul className="space-y-3">
                    {companyLinks.map(link => (
                        <li key={link.label}><a href={link.href} className="hover:text-white transition-colors">{link.label}</a></li>
                    ))}
                </ul>
            </div>

            <div>
                <h4 className="text-lg font-bold text-white mb-4">{t('landing.footer.contact.title')}</h4>
                <ul className="space-y-3">
                    {contactItems.map(item => (
                        <li key={item.label} className="flex items-start gap-3 rtl:flex-row-reverse">
                            <i className={item.icon + ' mt-1 text-primary'}></i>
                            <span>{item.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <div className="pt-8 border-t border-gray-800 text-center">
            <p>{t('landing.footer.copyright', { year: currentYear })}</p>
        </div>
    </div>
</footer>

            </main>
        </div>
    );
}
