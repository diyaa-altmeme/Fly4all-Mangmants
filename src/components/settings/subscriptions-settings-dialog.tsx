
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { getSettings } from '@/app/settings/actions';
import SubscriptionsSettings from './subscriptions-settings';
import { Loader2, Settings } from 'lucide-react';
import type { AppSettings } from '@/lib/types';

interface SubscriptionsSettingsDialogProps {
    onSettingsChanged: () => void;
    children: React.ReactNode;
}

export default function SubscriptionsSettingsDialog({ onSettingsChanged, children }: SubscriptionsSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        if(open) {
            setLoading(true);
            getSettings().then(data => {
                setSettings(data);
            }).catch(() => {
                 toast({ title: 'خطأ', description: 'لم يتم تحميل الإعدادات', variant: 'destructive' });
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [open, toast]);

    const handleSettingsSaved = () => {
        onSettingsChanged();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>إعدادات الاشتراكات</DialogTitle>
                    <DialogDescription>
                        تخصيص الخيارات الافتراضية، سياسات التقسيط، والتنبيهات الآلية للاشتراكات.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto">
                    {loading || !settings ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                         <SubscriptionsSettings settings={settings} onSettingsChanged={handleSettingsSaved} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
