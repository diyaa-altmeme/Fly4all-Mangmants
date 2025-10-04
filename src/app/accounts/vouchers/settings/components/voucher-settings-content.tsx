
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardSettingsForm } from "./standard-settings-form";
import DistributedSettingsForm from "./distributed-settings-form";
import type { AppSettings, Box, Client, Supplier } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useVoucherNav } from '@/context/voucher-nav-context';

interface VoucherSettingsContentProps {
    initialSettings: AppSettings;
    onDataChanged: () => void;
}

export default function VoucherSettingsContent({
    initialSettings,
    onDataChanged
}: VoucherSettingsContentProps) {
    
    const { data: navData } = useVoucherNav();

    const handleSettingsSaved = () => {
        onDataChanged();
    };

    return (
        <Tabs defaultValue="standard" className="w-full">
            <TabsList>
                <TabsTrigger value="standard">سند قبض عادي</TabsTrigger>
                <TabsTrigger value="distributed">سند قبض مخصص</TabsTrigger>
                <TabsTrigger value="remittance">سند حوالة</TabsTrigger>
                <TabsTrigger value="payment">سند دفع</TabsTrigger>
                <TabsTrigger value="expense">سند مصاريف</TabsTrigger>
                <TabsTrigger value="transfer">سند قيد داخلي</TabsTrigger>
            </TabsList>

            <TabsContent value="standard">
                <StandardSettingsForm 
                    initialSettings={initialSettings?.voucherSettings?.['standard']} 
                    availableBoxes={navData?.boxes || []}
                    onSaveSuccess={handleSettingsSaved}
                />
            </TabsContent>
            <TabsContent value="distributed">
                    <DistributedSettingsForm 
                    initialSettings={initialSettings?.voucherSettings?.distributed}
                    onSaveSuccess={handleSettingsSaved}
                    />
            </TabsContent>
            <TabsContent value="remittance">
                    <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>إعدادات سند الحوالة</CardTitle>
                        <CardDescription>سيتم بناء واجهة الإعدادات هنا قريبًا.</CardDescription>
                    </CardHeader>
                </Card>
            </TabsContent>
            <TabsContent value="payment">
                    <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>إعدادات سند الدفع</CardTitle>
                        <CardDescription>سيتم بناء واجهة الإعدادات هنا قريبًا.</CardDescription>
                    </CardHeader>
                </Card>
            </TabsContent>
            <TabsContent value="expense">
                    <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>إعدادات سند المصاريف</CardTitle>
                        <CardDescription>سيتم بناء واجهة الإعدادات هنا قريبًا.</CardDescription>
                    </CardHeader>
                </Card>
            </TabsContent>
            <TabsContent value="transfer">
                    <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>إعدادات سند القيد الداخلي</CardTitle>
                        <CardDescription>سيتم بناء واجهة الإعدادات هنا قريبًا.</CardDescription>
                    </CardHeader>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
