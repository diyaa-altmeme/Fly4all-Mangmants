
"use client";

import React, { useState, useMemo } from 'react';
import { Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch } from 'lucide-react';
import AppearanceSettings from '@/app/settings/sections/appearance-settings';
import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettings from '@/app/settings/sections/relations-settings';


export const useSettingsNavigation = () => {
    
    const settingSections = [
        { id: 'appearance', name: 'المظهر والأصول', component: AppearanceSettings, icon: Palette },
        { id: 'accounting', name: 'الإعدادات المحاسبية', component: AccountingSettings, icon: GitBranch },
        { id: 'relations', name: 'إعدادات العلاقات', component: RelationsSettings, icon: Users },
        { id: 'api', name: 'الربط الخارجي (API)', component: ApiSettings, icon: Link2 },
        { id: 'status', name: 'حالة النظام', component: SystemStatusSettings, icon: Database },
    ];


    const [searchTerm, setSearchTerm] = useState("");
    const [activeSection, setActiveSection] = useState("appearance");

    const filteredSections = useMemo(() => {
        if (!searchTerm) return settingSections;
        return settingSections.filter(section =>
            section.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return {
        searchTerm,
        setSearchTerm,
        activeSection,
        setActiveSection,
        filteredSections
    };
};
