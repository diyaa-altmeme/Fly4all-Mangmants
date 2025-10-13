
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Palette } from 'lucide-react';
import { THEMES, getThemeFromId } from '@/lib/themes';
import { useThemeCustomization } from '@/context/theme-customization-context';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import ThemeEditor from '@/components/settings/theme-editor';
import type { ThemeSettings } from '@/lib/types';


export default function ThemeSelector() {
    const { activeTheme, setActiveTheme, isSaving: isSavingTheme, themeSettings, refreshData } = useThemeCustomization();
    const [selectedThemeForEdit, setSelectedThemeForEdit] = useState<ThemeSettings | null>(null);
    const [isClient, setIsClient] = React.useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleThemeConfigSave = async (updatedTheme: ThemeSettings) => {
        // This function will be passed to ThemeEditor but the saving logic
        // is now centralized in the context provider. The editor will call this
        // on save, which then triggers the context's save functionality.
        // For now, we just refresh data.
        if (refreshData) {
            await refreshData();
        }
        setSelectedThemeForEdit(null); // Close editor on save
    }
    
    if (selectedThemeForEdit) {
        return (
            <ThemeEditor
                theme={selectedThemeForEdit}
                onBack={() => setSelectedThemeForEdit(null)}
                onSave={handleThemeConfigSave}
            />
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">الثيمات العامة</CardTitle>
                        <CardDescription>اختر الهوية البصرية التي تناسب علامتك التجارية. سيتم تطبيق الثيم على حسابك الشخصي.</CardDescription>
                    </div>
                    {isSavingTheme && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>جاري حفظ اختيارك...</div>}
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEMES.map(theme => {
                    const { primary, secondary, accent, background } = theme.config.light;
                    const colors = [primary, secondary, accent, background].filter(Boolean) as string[];
                    const isActive = isClient && theme.id === activeTheme.id;

                    return (
                        <Card 
                            key={theme.id}
                            className={cn(
                                "cursor-pointer transition-all flex flex-col hover:shadow-lg",
                                isActive ? 'border-primary ring-2 ring-primary/50' : 'hover:border-primary/50'
                            )}
                            onClick={() => setActiveTheme(theme.id)}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{theme.name}</CardTitle>
                                    {isActive && <Check className="h-5 w-5 text-primary" />}
                                </div>
                                <CardDescription className="text-xs">{theme.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                <div className="flex h-8 w-full gap-1">
                                    {colors.map((color, i) => (
                                        <div key={i} className="h-full w-full rounded" style={{ backgroundColor: `hsl(${color})` }} />
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="p-3">
                                <Button variant="secondary" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setSelectedThemeForEdit(theme); }}>
                                    <Palette className="me-2 h-4 w-4"/>
                                    تخصيص
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </CardContent>
        </Card>
    );
}
