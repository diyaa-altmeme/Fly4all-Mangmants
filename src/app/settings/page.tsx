
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getSettings } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Users, SlidersHorizontal, Upload, MessageSquareQuote, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, Shield, FileText, Terminal as DeveloperIcon, Paintbrush, FileBarChart, Banknote } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettingsPage from '@/app/relations/settings/page';
import AppearancePage from '@/app/settings/themes/page';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ExchangeSettings from '@/app/settings/sections/exchange-settings';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import { settingSections } from './sections.config';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';


function SettingsPageContent({ initialSettings, onSettingsChanged }: { initialSettings: AppSettings, onSettingsChanged: () => void }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("accounting_chart");
    const router = useRouter();

    const filteredSections = useMemo(() => {
        if (!searchTerm) return settingSections;

        return settingSections.map(section => {
            const filteredSubItems = section.subItems.filter(sub =>
                sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                section.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { ...section, subItems: filteredSubItems };
        }).filter(section => section.subItems.length > 0);
        
    }, [searchTerm]);
    
    const ActiveComponent = useMemo(() => {
        for (const section of settingSections) {
            const subItem = section.subItems.find(sub => sub.id === activeSection);
            if (subItem) return subItem.component;
        }
        return AccountingSettings; // Default component
    }, [activeSection]);


    const handleDataChange = useCallback(() => {
        // This will re-fetch data on the server for the current route
        router.refresh();
    }, [router]);


    if (!initialSettings) {
        return null;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start">
        <aside className="border-e bg-card p-4 space-y-4 rounded-lg h-full sticky top-20">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="بحث في الإعدادات..." 
                    className="ps-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={settingSections.map(s => s.id)}>
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
                     {ActiveComponent ? <ActiveComponent settings={initialSettings} onSettingsChanged={onSettingsChanged} /> : (
                        <div>الرجاء اختيار قسم من القائمة.</div>
                     )}
                </CardContent>
            </Card>
        </main>
      </div>
  );
}

export default function SettingsPage() {
    const [settings, setSettings] = React.useState<AppSettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
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

    return (
        <div className="space-y-6">
             <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات العامة</h1>
                <p className="text-muted-foreground">
                    تحكم في جميع جوانب النظام من هذه الواجهة المركزية.
                </p>
            </div>
             {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start p-4">
                    <Skeleton className="h-[600px] w-full" />
                    <Skeleton className="h-[600px] w-full" />
                </div>
            ) : error ? (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>حدث خطأ!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : settings ? (
                <SettingsPageContent initialSettings={settings} onSettingsChanged={fetchData} />
            ) : null}
        </div>
    );
}
