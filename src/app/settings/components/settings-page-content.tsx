
"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { AppSettings, TreeNode, User, Box, Client, Supplier, Exchange } from "@/lib/types";
import type { NormalizedFinanceAccounts } from '@/lib/finance/finance-accounts';
import { settingSections, appearanceSections } from '../sections.config';
import SettingsSidebar from "./settings-sidebar";

interface SettingsPageContentProps {
    initialSettings: AppSettings;
    chartOfAccounts: TreeNode[];
    financeMap: NormalizedFinanceAccounts;
    users: User[];
    boxes: Box[];
    clients: Client[];
    suppliers: Supplier[];
    exchanges: Exchange[];
}

export default function SettingsPageContent(props: SettingsPageContentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("themes_general"); // Default to themes
    
    // Consolidate all sections for filtering
    const allSections = useMemo(() => [...settingSections, ...appearanceSections], []);

    const filteredSections = useMemo(() => {
        if (!searchTerm) return allSections;

        return allSections.map(section => {
            const filteredSubItems = section.subItems.filter(sub =>
                sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                section.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { ...section, subItems: filteredSubItems };
        }).filter(section => section.subItems.length > 0);
        
    }, [searchTerm, allSections]);
    
    const ActiveComponent = useMemo(() => {
        for (const section of allSections) {
            const subItem = section.subItems.find(sub => sub.id === activeSection);
            if (subItem) return subItem.component;
        }
        const defaultSection = appearanceSections[0]?.subItems[0]?.component;
        return defaultSection || null;
    }, [activeSection, allSections]);

    // This callback will be used to refresh the entire settings data from the top-level page
    const handleSettingsChanged = useCallback(() => {
        // In a real app, we'd probably call a function passed down via props
        // to re-trigger the server action in `settings/page.tsx`.
        // For now, a window reload is the simplest way to see changes.
        window.location.reload();
    }, []);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start">
        <SettingsSidebar 
            sections={filteredSections} 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
        />
        <main className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                     {ActiveComponent ? <ActiveComponent settings={props.initialSettings} onSettingsChanged={handleSettingsChanged} {...props} /> : (
                        <div>الرجاء اختيار قسم من القائمة.</div>
                     )}
                </CardContent>
            </Card>
        </main>
      </div>
  );
}
