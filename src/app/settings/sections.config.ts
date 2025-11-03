
"use client";

import React from 'react';
import {
    Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, Shield, FileText, Code as DeveloperIcon, Paintbrush, FileBarChart, Banknote, DollarSign, WalletCards, MessageSquare, Briefcase, History, FileImage, HelpCircle, Building, FileSpreadsheet
} from 'lucide-react';

// Import client components
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import CurrencySettings from '@/components/settings/currency-settings';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';
import InvoiceSequencesPage from '@/app/settings/invoice-sequences/page';
import ClientPermissionsPage from '@/app/settings/client-permissions/page';
import AccountingSettingsPage from '@/app/settings/accounting/page';
import ThemeSelector from '@/app/settings/themes/components/theme-selector';
import AliasesSettings from '@/app/relations/settings/import/components/aliases-settings';
import DynamicImportTool from '@/app/relations/settings/import/components/dynamic-import-tool';


export const settingSections = [
    { 
        id: 'accounting', 
        name: 'الإعدادات المحاسبية والمالية', 
        icon: GitBranch,
        subItems: [
            { id: 'accounting_main', name: 'الربط والدليل المحاسبي', icon: GitBranch, component: AccountingSettingsPage },
            { id: 'accounting_currencies', name: 'العملات', icon: Banknote, component: CurrencySettings },
            { id: 'accounting_sequences', name: 'تسلسل الفواتير', icon: FileBarChart, component: InvoiceSequencesPage },
        ],
    },
    { 
        id: 'relations', 
        name: 'إعدادات العلاقات', 
        icon: Users,
        subItems: [
            { id: 'relations_fields', name: 'إدارة الحقول', icon: SlidersHorizontal, component: AliasesSettings },
            { id: 'relations_import', name: 'استيراد Excel', icon: FileSpreadsheet, component: DynamicImportTool },
            { id: 'client_permissions', name: 'صلاحيات العملاء', icon: Shield, component: ClientPermissionsPage },
        ],
    },
    { 
        id: 'external_integrations', 
        name: 'الربط الخارجي (API)', 
        icon: Link2,
        subItems: [
            { id: 'api_whatsapp', name: 'WhatsApp', icon: MessageSquare, component: ApiSettings }
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
            { id: 'themes_general', name: 'الثيمات العامة', icon: Paintbrush, component: ThemeSelector },
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
