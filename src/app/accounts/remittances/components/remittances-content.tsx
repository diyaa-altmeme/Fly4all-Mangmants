

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Remittance, User, Client, Box, RemittanceSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Text, Wand2, Settings } from 'lucide-react';
import RemittancesTable from './remittances-table';
import AddRemittanceDialog from './add-remittance-dialog';
import RemittancesSettingsDialog from './remittances-settings-dialog';
import { produce } from 'immer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SmartTextEntry from './smart-text-entry';
import { useVoucherNav } from '@/context/voucher-nav-context';

interface RemittancesContentProps {
    initialRemittances: Remittance[];
    onDataChange: () => void;
}

export default function RemittancesContent({ initialRemittances, onDataChange }: RemittancesContentProps) {
    const [remittances, setRemittances] = useState<Remittance[]>(initialRemittances);
    const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    const remittanceSettings = navData?.settings?.remittanceSettings;

    useEffect(() => {
        setRemittances(initialRemittances);
    }, [initialRemittances]);

    const handleRemittanceAdded = (newRemittance: Remittance) => {
        setRemittances(produce(draft => {
            draft.unshift(newRemittance);
        }));
         onDataChange();
    };
    
    const handleRemittanceUpdated = (updatedRemittance: Remittance) => {
        setRemittances(produce(draft => {
            const index = draft.findIndex(r => r.id === updatedRemittance.id);
            if (index !== -1) {
                draft[index] = updatedRemittance;
            }
        }));
        onDataChange();
    };

    if (!isDataLoaded || !remittanceSettings) {
        return <div>جاري تحميل الإعدادات...</div>
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,500px] gap-6 items-start">
            <div className="space-y-6">
                 <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>سجل الحوالات</CardTitle>
                            <CardDescription>آخر الحوالات التي تم تسجيلها في النظام.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <RemittancesSettingsDialog initialSettings={remittanceSettings} onSuccess={onDataChange} />
                             <AddRemittanceDialog
                                onRemittanceAdded={handleRemittanceAdded}
                            >
                                <Button><PlusCircle className="me-2 h-4 w-4"/>إضافة يدوية</Button>
                            </AddRemittanceDialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <RemittancesTable 
                            remittances={remittances} 
                            onSuccess={onDataChange}
                        />
                    </CardContent>
                </Card>
            </div>
             <div className="xl:sticky top-20">
                <SmartTextEntry remittanceSettings={remittanceSettings} onRemittanceAdded={handleRemittanceAdded}/>
            </div>
        </div>
    );
}
