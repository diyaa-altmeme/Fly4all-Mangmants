
"use client";

import React, { useState, useEffect } from 'react';
import type { ThemeSettings, ThemeColors, SidebarThemeSettings, CardThemeSettings, LoaderSettings } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { produce } from 'immer';
import { ArrowLeft, Sun, Moon, Save, Loader2, Palette, Users, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NumericInput } from '../ui/numeric-input';
import { useThemeCustomization } from '@/context/theme-customization-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Separator } from '../ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Image from 'next/image';

const hslStringToHex = (hslStr: string): string => {
  if (!hslStr || typeof hslStr !== 'string') return '#000000';
  if (hslStr.startsWith('#')) return hslStr;
  const [h, s, l] = hslStr.replace(/%/g, '').split(' ').map(parseFloat);
  if (isNaN(h) || isNaN(s) || isNaN(l)) return '#000000';
  
  const sDecimal = s / 100;
  const lDecimal = l / 100;
  
  let c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = lDecimal - c/2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const ColorInput = ({ label, value, onChange }: { label: string, value?: string, onChange: (value: string) => void }) => {
    const [colorValue, setColorValue] = useState(value || '');
    useEffect(() => {
        setColorValue(value || '');
    }, [value]);
    
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => { setColorValue(e.target.value); }
    const handleBlur = () => { onChange(colorValue); }
    
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      // Convert HEX back to HSL string for consistency if needed, or handle as HEX
      // For now, let's just update with the hex value for simplicity in display,
      // but the app's CSS variables expect HSL parts. The parent component should handle conversion.
      setColorValue(hex); 
      onChange(hex); // Pass hex up
    }
    
    const colorPickerValue = value ? (value.includes(' ') ? hslStringToHex(value) : value) : '#000000';

    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <div className="relative">
                <Input value={colorValue} onChange={handleTextChange} onBlur={handleBlur} className="pr-12" />
                <div 
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1 bg-transparent border-none cursor-pointer rounded-md"
                    style={{ backgroundColor: colorPickerValue }}
                >
                    <Input type="color" value={colorPickerValue} onChange={handleColorChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                </div>
            </div>
        </div>
    );
};

const Section = ({ title, description, settings, preview }: { title: string, description?: string, settings: React.ReactNode, preview: React.ReactNode }) => (
    <Card className="shadow-sm overflow-hidden">
        <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                    {settings}
                </div>
                 <div className="p-4 border rounded-lg bg-muted/30 min-h-[120px] flex items-center justify-center">
                    {preview}
                </div>
            </div>
        </CardContent>
    </Card>
);

const ColorPalettePreview = ({ colors }: { colors: ThemeColors }) => (
    <div className="flex gap-2 w-full">
        <div className="flex-1 space-y-1 text-center">
            <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.background})` }} />
            <p className="text-xs">الخلفية</p>
        </div>
        <div className="flex-1 space-y-1 text-center">
            <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.primary})` }} />
            <p className="text-xs">الرئيسي</p>
        </div>
        <div className="flex-1 space-y-1 text-center">
            <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.secondary})` }} />
            <p className="text-xs">الثانوي</p>
        </div>
         <div className="flex-1 space-y-1 text-center">
            <div className="h-12 rounded-md" style={{ backgroundColor: `hsl(${colors.accent})` }} />
            <p className="text-xs">المميز</p>
        </div>
    </div>
);

const SidebarPreview = ({ config }: { config: SidebarThemeSettings }) => (
    <div 
        className="w-48 h-64 rounded-lg flex flex-col p-2 gap-2"
        style={{
            backgroundColor: config.backgroundColor,
            color: config.textColor,
            fontFamily: config.fontFamily,
            fontSize: `${config.fontSize}px`,
        }}
    >
        <div className="flex items-center gap-2 font-bold p-2">
            <Palette className="h-6 w-6"/>
            <span>اسم النظام</span>
        </div>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: config.accentColor, color: config.accentTextColor }}><LayoutDashboard/> الرئيسية</div>
            <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: config.hoverBackgroundColor, color: config.hoverTextColor }}><Users/> العملاء</div>
            <div className="flex items-center gap-2 p-2 rounded-md"><SettingsIcon/> الإعدادات</div>
        </div>
    </div>
);

const CardPreview = ({ config, type }: { config: CardThemeSettings, type: 'client' | 'supplier' | 'both' }) => {
    let title = 'بطاقة عميل';
    let gradient = `linear-gradient(to right, ${config.headerClientColorFrom}, ${config.headerClientColorTo})`;

    if (type === 'supplier') {
        title = 'بطاقة مورد';
        gradient = `linear-gradient(to right, ${config.headerSupplierColorFrom}, ${config.headerSupplierColorTo})`;
    } else if (type === 'both') {
        title = 'عميل ومورد';
        gradient = `linear-gradient(to right, ${config.headerBothColorFrom}, ${config.headerBothColorTo})`;
    }

    return (
        <div 
            className="w-48 h-32 rounded-lg flex flex-col overflow-hidden shadow-md"
            style={{ borderRadius: `${config.borderRadius}px` }}
        >
            <div
                className="p-3 text-white flex-shrink-0"
                style={{ 
                    background: gradient,
                    minHeight: `60px`
                }}
            >
                 <h4 className="font-bold" style={{ fontSize: `14px`}}>{title}</h4>
            </div>
            <div className="flex-grow bg-card p-3">
                 <p className="text-xs text-muted-foreground" style={{ fontSize: `12px`}}>هذا مثال لمحتوى البطاقة.</p>
            </div>
        </div>
    );
};

const LoaderPreview = ({ config }: { config: LoaderSettings }) => (
     <div className="w-full h-10 flex items-center bg-muted rounded-lg overflow-hidden">
        <div className="relative w-full h-full">
             <div 
                className="absolute top-0 left-0 h-full bg-primary animate-pulse"
                style={{
                    width: '60%',
                    backgroundColor: config.color,
                    height: `${config.height}px`,
                    boxShadow: config.showShadow ? `0 0 10px ${config.color}` : 'none'
                }}
            />
        </div>
    </div>
);

interface ThemeEditorProps {
    theme: ThemeSettings;
    onSave: (updatedTheme: ThemeSettings) => void;
    onBack: () => void;
}

export default function ThemeEditor({ theme, onSave, onBack }: ThemeEditorProps) {
    const [customTheme, setCustomTheme] = useState(theme);
    const [mode, setMode] = useState<'light' | 'dark'>('light');
    const { setTheme } = useTheme();

    useEffect(() => { setCustomTheme(theme); }, [theme]);
    useEffect(() => { setTheme(mode); }, [mode, setTheme]);

    const handleColorChange = (key: keyof ThemeColors, value: string) => {
        setCustomTheme(produce(draft => { (draft.config[mode] as any)[key] = value; }));
    };
    const handleSidebarChange = (key: keyof SidebarThemeSettings, value: string | number | boolean) => {
        setCustomTheme(produce(draft => {
            if (!draft.config.sidebar) draft.config.sidebar = {};
            (draft.config.sidebar as any)[key] = value;
        }));
    };
    const handleCardChange = (key: keyof CardThemeSettings, value: string | number) => {
        setCustomTheme(produce(draft => {
            if (!draft.config.card) draft.config.card = {};
            (draft.config.card as any)[key] = value;
        }));
    };
    const handleLoaderChange = (key: keyof LoaderSettings, value: string | number | boolean) => {
        setCustomTheme(produce(draft => {
            if (!draft.config.loader) draft.config.loader = {};
            (draft.config.loader as any)[key] = value;
        }));
    };

    const colorConfig = customTheme.config[mode];
    const sidebarConfig = customTheme.config.sidebar || {};
    const cardConfig = customTheme.config.card || {};
    const loaderConfig = customTheme.config.loader || {};

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-background py-2 z-10">
                <Button variant="ghost" onClick={onBack}><ArrowLeft className="me-2 h-4 w-4"/>العودة للثيمات</Button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button size="icon" variant={mode === 'light' ? 'secondary' : 'ghost'} onClick={() => setMode('light')}><Sun/></Button>
                        <Button size="icon" variant={mode === 'dark' ? 'secondary' : 'ghost'} onClick={() => setMode('dark')}><Moon/></Button>
                    </div>
                     <Button onClick={() => onSave(customTheme)}><Save className="me-2 h-4 w-4"/>حفظ التغييرات على الثيم</Button>
                </div>
            </div>
            
             <div className="space-y-6">
                <Section
                    title="الألوان الأساسية"
                    description="الألوان الرئيسية التي تشكل هوية النظام البصرية."
                    settings={
                        <>
                            <ColorInput label="الخلفية" value={colorConfig?.background} onChange={(v) => handleColorChange('background', v)} />
                            <ColorInput label="الرئيسي" value={colorConfig?.primary} onChange={(v) => handleColorChange('primary', v)} />
                            <ColorInput label="الثانوي" value={colorConfig?.secondary} onChange={(v) => handleColorChange('secondary', v)} />
                            <ColorInput label="المميز" value={colorConfig?.accent} onChange={(v) => handleColorChange('accent', v)} />
                        </>
                    }
                    preview={<ColorPalettePreview colors={colorConfig} />}
                />
                 <Section
                    title="الشريط الجانبي"
                    description="تخصيص مظهر وألوان الشريط الجانبي للتنقل."
                    settings={
                         <>
                            <ColorInput label="لون الخلفية" value={sidebarConfig?.backgroundColor} onChange={(v) => handleSidebarChange('backgroundColor', v)} />
                            <ColorInput label="لون النص" value={sidebarConfig?.textColor} onChange={(v) => handleSidebarChange('textColor', v)} />
                            <ColorInput label="لون التحديد" value={sidebarConfig?.accentColor} onChange={(v) => handleSidebarChange('accentColor', v)} />
                            <ColorInput label="لون النص المحدد" value={sidebarConfig?.accentTextColor} onChange={(v) => handleSidebarChange('accentTextColor', v)} />
                         </>
                    }
                    preview={<SidebarPreview config={sidebarConfig} />}
                />

                 <Section
                    title="البطاقات"
                    description="إعدادات التدرج اللوني لرؤوس بطاقات العملاء والموردين."
                    settings={
                         <div className="space-y-4">
                            <h4 className="font-semibold text-sm">تدرج العميل</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="من" value={cardConfig?.headerClientColorFrom} onChange={(v) => handleCardChange('headerClientColorFrom', v)} />
                                <ColorInput label="إلى" value={cardConfig?.headerClientColorTo} onChange={(v) => handleCardChange('headerClientColorTo', v)} />
                            </div>
                            <h4 className="font-semibold text-sm">تدرج المورد</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="من" value={cardConfig?.headerSupplierColorFrom} onChange={(v) => handleCardChange('headerSupplierColorFrom', v)} />
                                <ColorInput label="إلى" value={cardConfig?.headerSupplierColorTo} onChange={(v) => handleCardChange('headerSupplierColorTo', v)} />
                            </div>
                            <h4 className="font-semibold text-sm">تدرج الموحد</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <ColorInput label="من" value={cardConfig?.headerBothColorFrom} onChange={(v) => handleCardChange('headerBothColorFrom', v)} />
                                <ColorInput label="إلى" value={cardConfig?.headerBothColorTo} onChange={(v) => handleCardChange('headerBothColorTo', v)} />
                            </div>
                         </div>
                    }
                    preview={
                        <div className="flex flex-wrap gap-4 justify-center">
                            <CardPreview config={cardConfig} type="client" />
                            <CardPreview config={cardConfig} type="supplier" />
                            <CardPreview config={cardConfig} type="both" />
                        </div>
                    }
                />

                 <Section
                    title="شريط التحميل العلوي"
                    description="تخصيص شريط التحميل الذي يظهر عند التنقل بين الصفحات."
                    settings={
                         <>
                            <ColorInput label="اللون" value={loaderConfig?.color} onChange={(v) => handleLoaderChange('color', v)} />
                            <NumericInput placeholder="الارتفاع (px)" value={loaderConfig.height} onValueChange={v => handleLoaderChange('height', v || 3)}/>
                            <div className="flex items-center gap-2 pt-2 md:col-span-2">
                                 <Switch id="loader-shadow" checked={loaderConfig.showShadow} onCheckedChange={c => handleLoaderChange('showShadow', c)} />
                                 <Label htmlFor="loader-shadow">إظهار ظل لشريط التحميل</Label>
                            </div>
                         </>
                    }
                    preview={<LoaderPreview config={loaderConfig} />}
                />
            </div>
        </div>
    );
}

    