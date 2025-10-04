
"use client";

import React from 'react';
import {
    Users, GitBranch, SlidersHorizontal, Settings, Upload, CreditCard, Link2, Palette, Database, Presentation, ImageIcon, ScanSearch, MessageSquareQuote, Shield, FileText
} from 'lucide-react';
import AppearanceSettings from '@/app/settings/sections/appearance-settings';
import AccountingSettings from "@/app/settings/sections/accounting-settings";
import ApiSettings from "@/app/settings/sections/api-settings";
import SystemStatusSettings from "@/app/settings/sections/system-status-settings";
import ClientPermissionsPage from '@/app/settings/client-permissions/page';
import InvoiceSettings from '@/components/settings/invoice-settings';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import FieldsSettings from '@/app/relations/settings/fields/fields-settings';
import ImportSettings from '@/app/relations/settings/import/import-settings';
import AliasesSettings from '@/app/relations/settings/aliases/aliases-settings';
import CreditPolicySettings from '@/app/relations/settings/credit-policy/credit-policy-settings';

export const settingSections = [
    { 
        id: 'appearance', 
        name: 'المظهر والأصول', 
        icon: Palette,
        subItems: [
            { id: 'appearance_general', name: 'المظهر العام', component: AppearanceSettings, icon: Palette },
            { id: 'asset_management', name: 'إدارة الأصول', component: AssetManagementSettings, icon: ImageIcon },
            { id: 'landing_page', name: 'الواجهة التقديمية', component: LandingPageSettingsComponent, icon: Presentation },
            { id: 'invoice_templates', name: 'قوالب الفواتير', component: InvoiceSettings, icon: FileText },
        ]
    },
    { 
        id: 'accounting', 
        name: 'الإعدادات المحاسبية', 
        icon: GitBranch,
        subItems: [
             { id: 'accounting_main', name: 'الحسابات والعملات', component: AccountingSettings, icon: GitBranch },
        ]
    },
    { 
        id: 'relations', 
        name: 'إعدادات العلاقات', 
        icon: Users,
        subItems: [
            { id: 'relations_fields', name: 'إدارة الحقول', component: FieldsSettings, icon: SlidersHorizontal },
            { id: 'relations_import', name: 'الاستيراد والتصدير', component: ImportSettings, icon: Upload },
            { id: 'relations_aliases', name: 'مرادفات الاستيراد', component: MessageSquareQuote, icon: MessageSquareQuote },
            { id: 'relations_credit', name: 'سياسات الآجل', component: CreditPolicySettings, icon: CreditCard },
            { id: 'client_permissions', name: 'صلاحيات العملاء', component: ClientPermissionsPage, icon: Shield },
        ]
    },
    { 
        id: 'external_integrations', 
        name: 'الربط الخارجي (API)', 
        icon: Link2,
        subItems: [
             { id: 'api_connections', name: 'إعدادات الربط', component: ApiSettings, icon: Link2 },
        ]
    },
    { 
        id: 'system_status', 
        name: 'النظام والحالة', 
        icon: Database,
        subItems: [
             { id: 'system_status_check', name: 'فحص حالة النظام', component: SystemStatusSettings, icon: Shield },
        ]
    },
];
