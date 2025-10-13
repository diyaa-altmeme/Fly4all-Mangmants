
"use client";

import React from 'react';
import { Palette, Paintbrush, FileText, ImageIcon, Presentation, SlidersHorizontal } from 'lucide-react';
import ThemeSelector from './components/theme-selector';
import InvoiceSettings from '@/components/settings/invoice-settings';
import AssetManagementSettings from '@/app/settings/sections/asset-management';
import LandingPageSettingsComponent from '@/app/settings/sections/landing-page-settings';


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
