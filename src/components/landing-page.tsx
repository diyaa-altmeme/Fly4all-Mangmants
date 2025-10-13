
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Rocket, BarChart3, ShieldCheck, Repeat, ArrowLeft, LucideIcon, HelpCircle, BedDouble, Users, Store, CheckCircle, Smartphone, CreditCard, Ticket, MessageSquare, Target, BarChart2, Zap, Send, FileText as FileTextIcon, Wallet, Bell, LineChart, TargetIcon, FileText, GitBranch, Layers3, Network, Menu, AlignJustify, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTheme } from 'next-themes';

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
                 <div className="flex items-center gap-2">
                    <a href="#" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                            <Rocket/>
                        </div>
                        <span className="text-xl font-bold">Mudarib</span>
                    </a>
                </div>
                
                <nav className="hidden md:flex items-center gap-8">
                    {menuItems.map(item => (
                        <button key={item.label} onClick={() => scrollToSection(item.section)} className="font-medium hover:text-primary transition-colors">
                            {item.label}
                        </button>
                    ))}
                </nav>
                
                 <div className="flex items-center gap-2">
                    <Button asChild className="hidden md:inline-flex">
                        <Link href="/auth/login">تسجيل الدخول</Link>
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
                                        <Link href="/auth/login">تسجيل الدخول</Link>
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


export function LandingPage() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <LandingHeader isScrolled={isScrolled} />

            <main>
                <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
                    <div className="absolute inset-0 gradient-bg opacity-10"></div>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20 dark:opacity-10"></div>
                    
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full mb-6 animate-pulse">
                                <span className="font-medium">الإصدار الجديد متاح الآن!</span>
                            </div>
                            
                            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                    نظام المحاسبة الذكية
                                </span>
                                <br />
                                <span>لشركات السياحة والسفر</span>
                            </h1>
                            
                            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
                                حلول متكاملة لإدارة الحسابات المالية، تذاكر الطيران، الفيزا، والفواتير بكل ذكاء وسهولة
                            </p>
                            
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button asChild size="lg" className="px-8 py-4 text-lg transition-all transform hover:scale-105 shadow-lg shadow-primary/20">
                                    <Link href="/auth/login">ابدأ الآن مجانًا</Link>
                                </Button>
                                <Button asChild variant="secondary" size="lg" className="px-8 py-4 text-lg transition-all transform hover:scale-105 shadow-lg">
                                    <Link href="#features">اكتشف المميزات</Link>
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
                
                <section id="features" className="py-20 bg-gray-100 dark:bg-gray-800/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">مميزات <span className="text-primary">استثنائية</span></h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                اكتشف الأدوات القوية التي تجعل عملك أسهل وأكثر كفاءة
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard icon={Zap} title="إدخال ذكي للبيانات" description="استيراد تلقائي لبيانات التذاكر والفيزا والفواتير من ملفات PDF بضغطة زر واحدة." />
                            <FeatureCard icon={LineChart} title="تقارير وتحليلات" description="كشوفات حسابات مفصلة وتقارير أرباح متقدمة لدعم اتخاذ القرارات." />
                            <FeatureCard icon={ShieldCheck} title="تدقيق ومطابقة" description="أدوات ذكية لمطابقة الكشوفات بينك وبين الموردين وكشف الفروقات بسهولة." />
                            <FeatureCard icon={Repeat} title="مزامنة فورية" description="تحديث البيانات تلقائيًا بين الفروع والمستخدمين في الوقت الفعلي." />
                            <FeatureCard icon={Smartphone} title="تطبيق متنقل" description="إدارة عملك من أي مكان عبر تطبيق الهاتف مع إشعارات فورية." />
                            <FeatureCard icon={MessageSquare} title="دعم فني 24/7" description="فريق دعم فني متاح على مدار الساعة لمساعدتك في أي استفسار." />
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="py-20">
                     <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">كيف <span className="text-primary">يعمل</span> النظام؟</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                ثلاث خطوات بسيطة لتحويل عملك إلى تجربة رقمية متكاملة
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                           <StepCard number={1} title="رفع المستندات" description="قم برفع ملفات PDF الخاصة بالتذاكر، الفيزا، والفواتير إلى النظام." imageUrl="https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80" />
                           <StepCard number={2} title="المعالجة الذكية" description="يقوم النظام بمعالجة المستندات واستخراج البيانات المالية تلقائيًا." imageUrl="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1085&q=80" />
                           <StepCard number={3} title="إدارة وتقارير" description="تصفح البيانات المالية، أنشئ التقارير، واتخذ القرارات بكل ثقة." imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1085&q=80" />
                        </div>
                    </div>
                </section>
                
                 <footer className="bg-gray-900 text-gray-300 py-12">
                    <div className="container mx-auto px-4">
                        <div className="text-center">
                            <p>&copy; {new Date().getFullYear()} Mudarib. جميع الحقوق محفوظة.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

const Sun = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
)

const Moon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
)
