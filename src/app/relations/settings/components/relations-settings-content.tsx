
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, SlidersHorizontal } from 'lucide-react';
import AliasesSettings from '@/app/relations/settings/import/components/aliases-settings';
import DynamicImportTool from '@/app/relations/settings/import/components/dynamic-import-tool';
import type { AppSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RelationsSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

const NavButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <Button 
        variant={active ? "secondary" : "ghost"}
        className="w-full justify-start gap-2 font-semibold"
        onClick={onClick}
    >
        {children}
    </Button>
);

export default function RelationsSettings({ settings, onSettingsChanged }: RelationsSettingsProps) {
    const [activeView, setActiveView] = useState<'fields' | 'import'>('fields');
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6">
            <aside>
                <nav className="flex flex-col gap-1">
                    <NavButton active={activeView === 'fields'} onClick={() => setActiveView('fields')}>
                        <SlidersHorizontal className="h-4 w-4"/> إدارة الحقول
                    </NavButton>
                     <NavButton active={activeView === 'import'} onClick={() => setActiveView('import')}>
                        <FileSpreadsheet className="h-4 w-4"/> استيراد Excel
                    </NavButton>
                </nav>
            </aside>
            <main>
                {activeView === 'fields' && (
                    <Card>
                        <CardContent className="pt-6">
                            <AliasesSettings settings={settings} onSettingsChanged={onSettingsChanged} />
                        </CardContent>
                    </Card>
                )}
                 {activeView === 'import' && (
                    <Card>
                         <CardHeader>
                            <CardTitle>أداة استيراد Excel</CardTitle>
                            <CardDescription>
                                اتبع الخطوات لاستيراد بيانات العملاء أو الموردين من ملف.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DynamicImportTool settings={settings} />
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
