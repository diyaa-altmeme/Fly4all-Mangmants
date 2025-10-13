
"use client";

import React from 'react';
import type { AppSettings } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import CampaignSettingsDialog from '@/app/campaigns/components/campaign-settings-dialog';


interface ApiSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function ApiSettings({ settings, onSettingsChanged }: ApiSettingsProps) {
    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>الربط مع الخدمات الخارجية (API)</CardTitle>
                    <CardDescription>
                        إدارة بيانات الاتصال مع الخدمات الخارجية مثل WhatsApp.
                    </CardDescription>
                    <div className="mt-4">
                         <CampaignSettingsDialog onSaveSuccess={onSettingsChanged} />
                    </div>
                </CardHeader>
            </Card>
            
        </div>
    )
}
