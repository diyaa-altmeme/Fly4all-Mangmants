
"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { AppSettings, TreeNode, FinanceAccountsMap, User, Box, Client, Supplier, Exchange } from "@/lib/types";
import { settingSections, appearanceSections } from '../sections.config';
import SettingsSidebar from "./settings-sidebar";

interface SettingsPageContentProps {
    initialSettings: AppSettings;
    chartOfAccounts: TreeNode[];
    financeMap: FinanceAccountsMap;
    users: User[];
    boxes: Box[];
    clients: Client[];
    suppliers: Supplier[];
    exchanges: Exchange[];
}

export default function SettingsPageContent(props: SettingsPageContentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("accounting_chart"); // Default to chart of accounts
    
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
        return null;
    }, [activeSection, allSections]);

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
                     {ActiveComponent ? <ActiveComponent {...props} /> : (
                        <div>الرجاء اختيار قسم من القائمة.</div>
                     )}
                </CardContent>
            </Card>
        </main>
      </div>
  );
}
