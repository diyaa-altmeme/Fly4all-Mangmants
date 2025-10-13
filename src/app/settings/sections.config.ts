
"use client";

import React from 'react';
import {
    Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, MessageSquareQuote, Shield, FileText, Terminal as DeveloperIcon
} from 'lucide-react';

import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettings from '@/app/relations/settings/page';
import AppearanceSettings from '@/app/settings/themes/page';

export const settingSections = [
    { 
        id: 'appearance', 
        name: 'المظهر', 
        icon: Palette,
        component: AppearanceSettings,
    },
    { 
        id: 'accounting', 
        name: 'المحاسبة', 
        icon: GitBranch,
        component: AccountingSettings,
    },
    { 
        id: 'relations', 
        name: 'العلاقات', 
        icon: Users,
        component: RelationsSettings,
    },
    { 
        id: 'hr', 
        name: 'الموظفين', 
        icon: Users,
        href: '/users'
    },
    { 
        id: 'external_integrations', 
        name: 'الربط الخارجي', 
        icon: Link2,
        component: ApiSettings,
    },
    { 
        id: 'system_status', 
        name: 'النظام والحالة', 
        icon: Database,
        component: SystemStatusSettings,
    },
];
