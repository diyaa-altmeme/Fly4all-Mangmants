
"use client";

import React from 'react';
import {
    Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, MessageSquareQuote, Shield, FileText, Terminal as DeveloperIcon, Paintbrush, FileBarChart, Banknote
} from 'lucide-react';

import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettingsPage from '@/app/relations/settings/page';
import AppearanceSettingsPage from '@/app/settings/themes/page';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ExchangeSettings from '@/app/settings/sections/exchange-settings';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';

export const settingSections = [
    { 
        id: 'appearance', 
        name: 'المظهر والأصول', 
        icon: Palette,
        subItems: [
            { id: 'appearance_general', name: 'الثيمات العامة', icon: Paintbrush, component: AppearanceSettingsPage },
            { id: 'appearance_invoice', name: 'الفواتير والتقارير', icon: FileText, component: InvoiceSettings },
            { id: 'appearance_assets', name: 'إدارة الأصول', icon: ImageIcon, component: AssetManagementSettings },
            { id: 'appearance_landing', name: 'صفحة الهبوط', icon: Presentation, component: LandingPageSettingsComponent },
        ],
    },
    { 
        id: 'accounting', 
        name: 'الإعدادات المحاسبية', 
        icon: GitBranch,
        subItems: [
            { id: 'accounting_chart', name: 'شجرة الحسابات', icon: GitBranch, component: AccountingSettings },
            { id: 'accounting_sequences', name: 'تسلسل الفواتير', icon: ListOrdered, component: InvoiceSequencesPage },
            { id: 'accounting_currencies', name: 'العملات', icon: Banknote, component: CurrencySettings },
        ],
    },
    { 
        id: 'relations', 
        name: 'إعدادات العلاقات', 
        icon: Users,
        subItems: [
            { id: 'relations_fields', name: 'إدارة الحقول', icon: SlidersHorizontal, component: RelationsSettingsPage },
        ],
    },
    { 
        id: 'external_integrations', 
        name: 'الربط الخارجي (API)', 
        icon: Link2,
        subItems: [
            { id: 'api_whatsapp', name: 'WhatsApp', icon: MessageSquareQuote, component: ApiSettings }
        ]
    },
    { 
        id: 'system', 
        name: 'النظام والحالة', 
        icon: Database,
        subItems: [
            { id: 'system_status', name: 'حالة الاتصال', icon: Database, component: SystemStatusSettings },
        ]
    },
];
