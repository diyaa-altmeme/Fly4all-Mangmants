
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface Section {
    id: string;
    name: string;
    icon: React.ElementType;
    subItems: {
        id: string;
        name: string;
        icon: React.ElementType;
    }[];
}

interface SettingsSidebarProps {
    sections: Section[];
    activeSection: string;
    setActiveSection: (id: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export default function SettingsSidebar({
    sections,
    activeSection,
    setActiveSection,
    searchTerm,
    setSearchTerm,
}: SettingsSidebarProps) {
    return (
        <aside className="border-e bg-card p-4 space-y-4 rounded-lg h-full sticky top-20">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="بحث في الإعدادات..." 
                    className="ps-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Accordion type="multiple" className="w-full" defaultValue={sections.map(s => s.id)}>
                {sections.map(section => {
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
    );
}
