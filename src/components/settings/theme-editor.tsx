
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, ArrowRight, Palette, Paintbrush } from 'lucide-react';
import { type ThemeSettings, type ThemeConfig } from '@/lib/themes';
import { produce } from 'immer';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import type { LoaderSettings } from '@/lib/types';
import { Switch } from '../ui/switch';

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="relative">
            <Input value={value} onChange={(e) => onChange(e.target.value)} className="ps-12 font-mono" />
            <Input
                type="color"
                value={`#${value.split(' ').pop()}`} // Crude but works for HSL hex
                onChange={(e) => {
                    const hex = e.target.value;
                    // This is a simplification; converting hex to HSL would be complex.
                    // For now, let's just update the input field, assuming the user will fine-tune the HSL.
                    // A proper implementation would use a color picker library that supports HSL.
                    onChange(hex);
                }}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1 bg-transparent border-none cursor-pointer"
            />
        </div>
    </div>
);

const ColorSection = ({ title, config, onConfigChange }: { title: string; config: any; onConfigChange: (key: string, value: string) => void }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(config).map(([key, value]) => (
            <ColorInput
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                value={String(value)}
                onChange={(newValue) => onConfigChange(key, newValue)}
            />
        ))}
    </div>
);

const LoaderSettingsEditor = ({ loaderConfig, onLoaderChange }: { loaderConfig: Partial<LoaderSettings>, onLoaderChange: (config: Partial<LoaderSettings>) => void }) => {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label>لون الشريط</Label>
                <Input value={loaderConfig.color || ''} onChange={e => onLoaderChange({ ...loaderConfig, color: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>ارتفاع الشريط (px)</Label>
                <Input type="number" value={loaderConfig.height || 3} onChange={e => onLoaderChange({ ...loaderConfig, height: Number(e.target.value) })} />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
                <Switch 
                    id="loader-shadow" 
                    checked={loaderConfig.showShadow}
                    onCheckedChange={c => onLoaderChange({...loaderConfig, showShadow: c})}
                />
                <Label htmlFor="loader-shadow">تفعيل تأثير التوهج</Label>
            </div>
        </div>
    )
}

interface ThemeEditorProps {
    theme: ThemeSettings;
    onBack: () => void;
    onSave: (updatedTheme: ThemeSettings) => Promise<void>;
}

export default function ThemeEditor({ theme, onBack, onSave }: ThemeEditorProps) {
    const [editedTheme, setEditedTheme] = useState(theme);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(editedTheme);
        setIsSaving(false);
    };
    
    const handleConfigChange = (mode: 'light' | 'dark' | 'sidebar' | 'card' | 'loader', key: string, value: string) => {
        setEditedTheme(produce(draft => {
            if (!draft.config[mode]) {
                (draft.config as any)[mode] = {};
            }
            (draft.config[mode] as any)[key] = value;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onBack}>
                    <ArrowRight className="me-2 h-4 w-4" />
                    العودة للثيمات
                </Button>
                <div className="text-right">
                    <h2 className="text-xl font-bold flex items-center justify-end gap-2">
                       <Palette className="h-5 w-5"/>
                       تخصيص ثيم: {editedTheme.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        قم بتعديل قيم الألوان والإعدادات ليناسب علامتك التجارية.
                    </p>
                </div>
            </div>
            
            <Accordion type="multiple" defaultValue={['light', 'dark']}>
                <AccordionItem value="light">
                    <AccordionTrigger className="font-bold text-base">الألوان (الوضع الفاتح)</AccordionTrigger>
                    <AccordionContent>
                        <ColorSection 
                            title="Light Mode"
                            config={editedTheme.config.light}
                            onConfigChange={(key, value) => handleConfigChange('light', key, value)}
                        />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dark">
                    <AccordionTrigger className="font-bold text-base">الألوان (الوضع الداكن)</AccordionTrigger>
                    <AccordionContent>
                        <ColorSection
                            title="Dark Mode"
                            config={editedTheme.config.dark}
                            onConfigChange={(key, value) => handleConfigChange('dark', key, value)}
                        />
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="card">
                    <AccordionTrigger className="font-bold text-base">ألوان بطاقات العملاء</AccordionTrigger>
                    <AccordionContent>
                        <ColorSection
                            title="Card Colors"
                            config={editedTheme.config.card || {}}
                            onConfigChange={(key, value) => handleConfigChange('card', key, value)}
                        />
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="loader">
                    <AccordionTrigger className="font-bold text-base">إعدادات شريط التقدم (Loader)</AccordionTrigger>
                    <AccordionContent>
                        <LoaderSettingsEditor
                            loaderConfig={editedTheme.config.loader || {}}
                            onLoaderChange={(config) => setEditedTheme(produce(editedTheme, draft => {draft.config.loader = config}))}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ التعديلات على الثيم
                </Button>
            </div>
        </div>
    );
}
