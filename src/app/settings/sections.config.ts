
"use client";

import React from 'react';
import {
    Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, MessageSquareQuote, Shield, FileText, Terminal as DeveloperIcon, Paintbrush, FileBarChart, Banknote
} from 'lucide-react';

import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import RelationsSettings from '@/app/relations/settings/components/relations-settings-content';
import AppearancePage from '@/app/settings/themes/page';
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import ExchangeSettings from '@/app/settings/sections/exchange-settings';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';

export const settingSections = [
    { 
        id: 'accounting', 
        name: 'الإعدادات المحاسبية والمالية', 
        icon: GitBranch,
        subItems: [
            { id: 'accounting_chart', name: 'شجرة الحسابات', icon: GitBranch, component: AccountingSettings },
            { id: 'accounting_sequences', name: 'تسلسل الفواتير', icon: FileBarChart, component: InvoiceSequencesPage },
            { id: 'accounting_currencies', name: 'العملات', icon: Banknote, component: CurrencySettings },
            { id: 'client_permissions', name: 'صلاحيات العملاء', icon: Shield, component: ClientPermissionsPage },
        ],
    },
    { 
        id: 'relations', 
        name: 'إعدادات العلاقات', 
        icon: Users,
        subItems: [
            { id: 'relations_fields', name: 'إدارة الحقول والاستيراد', icon: SlidersHorizontal, component: RelationsSettings },
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

export const appearanceSections = [
    {
        id: 'themes',
        name: 'الثيمات والألوان',
        icon: Palette,
        subItems: [
            { id: 'themes_general', name: 'الثيمات العامة', icon: Paintbrush, component: AppearancePage },
        ]
    },
    {
        id: 'branding',
        name: 'العلامة التجارية والأصول',
        icon: ImageIcon,
        subItems: [
             { id: 'assets_management', name: 'إدارة الأصول', icon: ImageIcon, component: AssetManagementSettings },
             { id: 'invoice_design', name: 'تصميم الفاتورة', icon: FileText, component: InvoiceSettings },
        ]
    },
    {
        id: 'landing_page',
        name: 'صفحة الهبوط',
        icon: Presentation,
        subItems: [
            { id: 'landing_page_settings', name: 'إعدادات المحتوى', icon: SlidersHorizontal, component: LandingPageSettingsComponent },
        ]
    }
];
