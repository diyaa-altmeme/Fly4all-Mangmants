
"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { settingSections } from '../sections.config';
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface SettingsPageContentProps {
    initialSettings: AppSettings;
    onSettingsChanged: () => void;
}

export default function SettingsPageContent({ initialSettings, onSettingsChanged }: SettingsPageContentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("appearance_general");

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
        return null; // Default or fallback component
    }, [activeSection]);


    if (!initialSettings) {
        return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-6 items-start">
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
            <Accordion type="single" collapsible className="w-full">
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
