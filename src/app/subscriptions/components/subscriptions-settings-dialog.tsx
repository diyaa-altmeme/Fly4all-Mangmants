
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
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

interface SubscriptionsSettingsDialogProps {
    onSettingsChanged: () => void;
    children: React.ReactNode;
}

export default function SubscriptionsSettingsDialog({ onSettingsChanged, children }: SubscriptionsSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const { data: navData, loaded: isDataLoaded, fetchData } = useVoucherNav();
    
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
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>إعدادات الاشتراكات</DialogTitle>
                     <DialogDescription>
                        تحديد الإعدادات الافتراضية عند إنشاء اشتراك جديد لتسهيل وتسريع عملية إدخال البيانات.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {!isDataLoaded || !navData ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                         <SubscriptionsSettings settings={navData.settings} onSettingsChanged={handleSave} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
