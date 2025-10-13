
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { getSettings } from '@/app/settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useRouter }from 'next/navigation';
import { appearanceSections } from './sections.config';
import ThemeSelector from './components/theme-selector';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';


function AppearancePageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("themes_general");
    const router = useRouter();

    const filteredSections = useMemo(() => {
        if (!searchTerm) return appearanceSections;

        return appearanceSections.map(section => {
            const filteredSubItems = section.subItems.filter(sub =>
                sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                section.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { ...section, subItems: filteredSubItems };
        }).filter(section => section.subItems.length > 0);
        
    }, [searchTerm]);
    
    const ActiveComponent = useMemo(() => {
        for (const section of appearanceSections) {
            const subItem = section.subItems.find(sub => sub.id === activeSection);
            if (subItem) return subItem.component;
        }
        return ThemeSelector; // Default component
    }, [activeSection]);


    if (!initialSettings) {
        return null;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start">
        <aside className="border-e bg-card p-4 space-y-4 rounded-lg h-full sticky top-20">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="بحث في إعدادات المظهر..." 
                    className="ps-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={appearanceSections.map(s => s.id)}>
                {filteredSections.map(section => {
                    const MainIcon = section.icon;
                    return(
                    <AccordionItem value={section.id} key={section.id} className="border-b-0">
                        <AccordionTrigger className="py-3 px-2 font-bold text-base hover:no-underline rounded-md data-[state=open]:text-primary justify-between">
                             <div className="flex items-center gap-3 justify-start w-full">
                                <MainIcon className="h-5 w-5" />
                                <span>{section.name}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pr-4 border-r-2 border-primary/50 mr-4">
                            <nav dir="rtl" className="flex flex-col gap-1 mt-2">
                                {section.subItems.map(subItem => {
                                    const SubIcon = subItem.icon;
                                    return (
                                        <Button
                                            key={subItem.id}
                                            variant="ghost"
                                            onClick={() => setActiveSection(subItem.id)}
                                            className={cn(
                                                "justify-start gap-3 font-semibold",
                                                activeSection === subItem.id && "bg-primary/10 text-primary"
                                            )}
                                        >
                                            <SubIcon className="h-4 w-4"/>
                                            {subItem.name}
                                        </Button>
                                    )
                                })}
                           </nav>
                        </AccordionContent>
                    </AccordionItem>
                )})}
            </Accordion>
        </aside>
        <main className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                     <ActiveComponent settings={initialSettings} onSettingsChanged={onSettingsChanged} />
                </CardContent>
            </Card>
        </main>
      </div>
  );
}


export default function AppearancePage() {
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (e: any) {
            setError(e.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start p-4">
                <Skeleton className="h-[600px] w-full" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }
    
     if (error || !settings) {
        return (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>حدث خطأ!</AlertTitle>
                <AlertDescription>{error || "فشل تحميل الإعدادات."}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
             <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إعدادات المظهر</h1>
                <p className="text-muted-foreground">
                    تخصيص الهوية البصرية الكاملة للنظام، من الألوان والثيمات إلى الشعارات وتصميم الفواتير.
                </p>
            </div>
             <AppearancePageContent initialSettings={settings} onSettingsChanged={fetchData} />
        </div>
    );
}
