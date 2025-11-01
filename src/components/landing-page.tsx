
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Rocket, LineChart, ShieldCheck, Repeat, ArrowLeft, LucideIcon, Menu, X, Sun, Moon, Zap, Smartphone, HelpCircle, User, Users, Store, Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import type { LandingPageSettings } from '@/lib/types';
import { Badge } from '@/components/ui/badge';


const LandingHeader = ({ isScrolled }: { isScrolled: boolean }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    const menuItems = [
        { label: 'المميزات', section: 'features' },
        { label: 'كيف يعمل', section: 'how-it-works' },
        { label: 'آراء العملاء', section: 'testimonials' },
        { label: 'الأسعار', section: 'pricing' },
    ];

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
                    <span className="text-xl font-bold">Mudarib</span>
                </Link>
                
                <nav className="hidden md:flex items-center gap-8">
                    {menuItems.map(item => (
                        <button key={item.label} onClick={() => scrollToSection(item.section)} className="font-medium hover:text-primary transition-colors">
                            {item.label}
                        </button>
                    ))}
                </nav>
                
                 <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="/auth/login">
                           تسجيل الدخول
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
                                    <SheetTitle>القائمة</SheetTitle>
                                </SheetHeader>
                                <nav className="flex flex-col p-4 space-y-4">
                                     {menuItems.map(item => (
                                        <button key={item.label} onClick={() => scrollToSection(item.section)} className="font-medium hover:text-primary transition-colors text-right py-2 border-b">
                                            {item.label}
                                        </button>
                                    ))}
                                    <Button asChild className="mt-6">
                                       <Link href="/auth/login">
                                         تسجيل الدخول
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

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const heroSettings = settings || {};

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
                                <span className="font-bold flex items-center gap-2"> <Zap className="h-4 w-4" /> الإصدار الجديد متاح الآن!</span>
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
                                    <Link href="/auth/login">
                                        ابدأ الآن مجانًا
                                    </Link>
                                </Button>
                                <Button asChild variant="secondary" size="lg" className="px-8 py-4 text-lg transition-all transform hover:scale-105 shadow-lg">
                                    <a href="#features">اكتشف المميزات</a>
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
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">مميزات <span className="text-primary">استثنائية</span></h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                اكتشف الأدوات القوية التي تجعل عملك أسهل وأكثر كفاءة
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard icon={Zap} title="إدخال ذكي للبيانات" description="استيراد تلقائي لبيانات التذاكر والفيزا والفواتير من ملفات PDF بضغطة زر واحدة." />
                            <FeatureCard icon={LineChart} title="تقارير وتحليلات" description="كشوفات حسابات مفصلة وتقارير أرباح متقدمة لدعم اتخاذ القرارات." />
                            <FeatureCard icon={ShieldCheck} title="تدقيق ومطابقة" description="أدوات ذكية لمقارنة كشف حسابك مع كشف حساب الموردين وكشف الفروقات والاختلافات تلقائيًا بدقة تصل إلى 99%." />
                            <FeatureCard icon={Repeat} title="مزامنة فورية" description="تحديث البيانات تلقائيًا بين الفروع والمستخدمين في الوقت الفعلي." />
                            <FeatureCard icon={Smartphone} title="تطبيق متنقل" description="إدارة عملك من أي مكان عبر تطبيق الهاتف مع إشعارات فورية." />
                            <FeatureCard icon={HelpCircle} title="دعم فني 24/7" description="فريق دعم فني متاح على مدار الساعة لمساعدتك في أي استفسار." />
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="py-20">
                     <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">كيف <span className="text-primary">يعمل</span> النظام؟</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                ثلاث خطوات بسيطة لتحويل عملك إلى تجربة رقمية متكاملة
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                           <StepCard number={1} title="رفع المستندات" description="قم برفع ملفات PDF الخاصة بالتذاكر، الفيزا، والفواتير إلى النظام." imageUrl="https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1064&auto=format&fit=crop" />
                           <StepCard number={2} title="المعالجة الذكية" description="يقوم النظام بمعالجة المستندات واستخراج البيانات المالية تلقائيًا." imageUrl="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1085&auto=format&fit=crop" />
                           <StepCard number={3} title="إدارة وتقارير" description="تصفح البيانات المالية، أنشئ التقارير، واتخذ القرارات بكل ثقة." imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1085&auto=format&fit=crop" />
                        </div>
                    </div>
                </section>
                
                <section id="testimonials" className="py-20 bg-muted/50">
                    <div className="container mx-auto px-4">
                         <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">يثق بنا <span className="text-primary">الخبراء</span></h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                آراء بعض عملائنا الذين يستخدمون النظام يوميًا لتحسين أعمالهم
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                             <Card className="bg-card text-card-foreground">
                                <CardContent className="p-8">
                                    <div className="flex items-center mb-4">
                                        <Image src="https://picsum.photos/seed/1/40/40" alt="User" width={40} height={40} className="rounded-full" />
                                        <div className="mr-4">
                                            <h4 className="font-bold">أحمد علي</h4>
                                            <p className="text-sm text-muted-foreground">مدير، شركة النور للسفر</p>
                                        </div>
                                    </div>
                                    <p className="mb-4">"النظام غيّر طريقة عملنا بالكامل. أصبحنا نوفر ساعات يوميًا بفضل الإدخال الذكي."</p>
                                    <div className="flex items-center text-yellow-500">
                                       <Star/><Star/><Star/><Star/><Star/>
                                    </div>
                                </CardContent>
                            </Card>
                             <Card className="bg-card text-card-foreground">
                                <CardContent className="p-8">
                                    <div className="flex items-center mb-4">
                                        <Image src="https://picsum.photos/seed/2/40/40" alt="User" width={40} height={40} className="rounded-full" />
                                        <div className="mr-4">
                                            <h4 className="font-bold">فاطمة حسن</h4>
                                            <p className="text-sm text-muted-foreground">محاسبة، شركة الأفق للسياحة</p>
                                        </div>
                                    </div>
                                    <p className="mb-4">"أداة التدقيق والمطابقة رائعة! كشفت لنا عن فروقات لم نكن لنلاحظها بالطرق التقليدية."</p>
                                    <div className="flex items-center text-yellow-500">
                                       <Star/><Star/><Star/><Star/><Star/>
                                    </div>
                                </CardContent>
                            </Card>
                             <Card className="bg-card text-card-foreground">
                                <CardContent className="p-8">
                                    <div className="flex items-center mb-4">
                                        <Image src="https://picsum.photos/seed/3/40/40" alt="User" width={40} height={40} className="rounded-full" />
                                        <div className="mr-4">
                                            <h4 className="font-bold">علي محمد</h4>
                                            <p className="text-sm text-muted-foreground">صاحب، شركة البراق للسياحة</p>
                                        </div>
                                    </div>
                                    <p className="mb-4">"الدعم الفني سريع ومتجاوب. التقارير المالية أصبحت واضحة ومفصلة أكثر من أي وقت مضى."</p>
                                    <div className="flex items-center text-yellow-500">
                                       <Star/><Star/><Star/><Star/><Star/>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                <section id="pricing" className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">خطط <span className="text-primary">أسعار</span> مرنة</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                اختر الخطة التي تناسب حجم أعمالك واحتياجات فريقك
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
                            <Card className="rounded-2xl border-2">
                                <CardHeader className="text-center">
                                    <CardTitle className="text-2xl">الخطة الأساسية</CardTitle>
                                    <CardDescription>مثالية للشركات الصغيرة والناشئة</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-5xl font-bold mb-4">$29<span className="text-lg font-normal text-muted-foreground">/شهر</span></p>
                                    <ul className="space-y-4 text-right">
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> حتى 3 مستخدمين</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> إدخال 500 تذكرة شهريًا</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> دعم فني عبر البريد الإلكتروني</li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" variant="outline">اختر الخطة</Button>
                                </CardFooter>
                            </Card>
                            <Card className="rounded-2xl border-2 border-primary shadow-lg scale-105">
                                 <CardHeader className="text-center">
                                    <div className="flex justify-center"><Badge>الأكثر شيوعًا</Badge></div>
                                    <CardTitle className="text-3xl text-primary">الخطة الاحترافية</CardTitle>
                                    <CardDescription>للشركات المتوسطة والمتنامية</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-6xl font-bold mb-4">$79<span className="text-lg font-normal text-muted-foreground">/شهر</span></p>
                                    <ul className="space-y-4 text-right">
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> حتى 10 مستخدمين</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> إدخال 2000 تذكرة شهريًا</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> أداة التدقيق والمطابقة</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> دعم فني عبر الدردشة</li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">اختر الخطة</Button>
                                </CardFooter>
                            </Card>
                            <Card className="rounded-2xl border-2">
                                 <CardHeader className="text-center">
                                    <CardTitle className="text-2xl">خطة الشركات</CardTitle>
                                    <CardDescription>حلول مخصصة للشركات الكبيرة</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-4xl font-bold my-8">تواصل معنا</p>
                                    <ul className="space-y-4 text-right">
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> عدد مستخدمين غير محدود</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> عدد تذاكر غير محدود</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> تقارير وتحليلات مخصصة</li>
                                        <li className="flex items-center justify-end gap-3"><Check className="text-green-500" /> دعم فني مخصص ومدير حساب</li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" variant="outline">تواصل مع المبيعات</Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </section>
                
                <section id="partners" className="py-20 bg-muted/50">
                    <div className="container mx-auto px-4">
                         <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">شركاء <span className="text-primary">النجاح</span></h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                نفخر بالتعاون مع نخبة من شركات السياحة والسفر الرائدة التي وثقت في نظامنا لتحقيق أهدافها.
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
                             <h2 className="text-3xl md:text-5xl font-bold mb-4">الأسئلة <span className="text-primary">الشائعة</span></h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                إجابات على بعض الأسئلة التي قد تخطر ببالك.
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
                                <div className="flex items-center space-x-2 space-x-reverse mb-4">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                                        <Rocket/>
                                    </div>
                                    <span className="text-xl font-bold text-white">Mudarib</span>
                                </div>
                                <p className="mb-4">
                                    نظام محاسبة متكامل لشركات السياحة والسفر لإدارة التذاكر، الفيزا، والفواتير بكل سهولة.
                                </p>
                                <div className="flex space-x-4 space-x-reverse">
                                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                                        <i className="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                                        <i className="fab fa-facebook-f"></i>
                                    </a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                                        <i className="fab fa-linkedin-in"></i>
                                    </a>
                                    <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                                        <i className="fab fa-instagram"></i>
                                    </a>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-bold text-white mb-4">روابط سريعة</h4>
                                <ul className="space-y-3">
                                    <li><a href="#" className="hover:text-white transition-colors">الصفحة الرئيسية</a></li>
                                    <li><a href="#features" className="hover:text-white transition-colors">المميزات</a></li>
                                    <li><a href="#how-it-works" className="hover:text-white transition-colors">كيف يعمل</a></li>
                                    <li><a href="#pricing" className="hover:text-white transition-colors">الأسعار</a></li>
                                    <li><a href="/auth/login" className="hover:text-white transition-colors">تسجيل الدخول</a></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-bold text-white mb-4">الشركة</h4>
                                <ul className="space-y-3">
                                    <li><a href="#" className="hover:text-white transition-colors">من نحن</a></li>
                                    <li><a href="#" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
                                    <li><a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a></li>
                                    <li><a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a></li>
                                    <li><a href="#" className="hover:text-white transition-colors">اتصل بنا</a></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-bold text-white mb-4">اتصل بنا</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-start">
                                        <i className="fas fa-map-marker-alt mt-1 mr-3 text-primary"></i>
                                        <span>الرياض، المملكة العربية السعودية</span>
                                    </li>
                                    <li className="flex items-center">
                                        <i className="fas fa-phone-alt mr-3 text-primary"></i>
                                        <span>+966 12 345 6789</span>
                                    </li>
                                    <li className="flex items-center">
                                        <i className="fas fa-envelope mr-3 text-primary"></i>
                                        <span>info@mudarib.com</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                         <div className="pt-8 border-t border-gray-800 text-center">
                            <p>&copy; {new Date().getFullYear()} Mudarib. جميع الحقوق محفوظة.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
