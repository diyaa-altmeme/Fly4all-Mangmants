
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, Loader2 } from 'lucide-react';
import SubscriptionsSettings from '@/components/settings/subscriptions-settings';
import { useVoucherNav } from '@/context/voucher-nav-context';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';
import { cn } from '@/lib/utils';

interface SubscriptionsSettingsDialogProps {
    onSettingsChanged: () => void;
    children: React.ReactNode;
}

export default function SubscriptionsSettingsDialog({ onSettingsChanged, children }: SubscriptionsSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const { data: navData, loaded: isDataLoaded, fetchData } = useVoucherNav();
    const [dialogDimensions, setDialogDimensions] = useState({ width: '1024px', height: '90vh' });


    useEffect(() => {
        if(open && !isDataLoaded) {
            fetchData();
        }
    }, [open, isDataLoaded, fetchData]);
    
    const handleSave = () => {
        onSettingsChanged();
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent 
                className="p-0 flex flex-col"
                style={{ maxWidth: dialogDimensions.width, width: '95vw', height: dialogDimensions.height }}
            >
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                    <div>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5"/>
                            إعدادات الاشتراكات
                        </DialogTitle>
                        <DialogDescription>
                            تحديد الإعدادات الافتراضية عند إنشاء اشتراك جديد لتسهيل وتسريع عملية إدخال البيانات.
                        </DialogDescription>
                    </div>
                    <VoucherDialogSettings
                        dialogKey="add_subscription"
                        onDimensionsChange={setDialogDimensions}
                    >
                        <Button variant="ghost" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </VoucherDialogSettings>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto">
                    <div className="p-6">
                        {!isDataLoaded || !navData ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                             <SubscriptionsSettings settings={navData.settings} onSettingsChanged={handleSave} />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
