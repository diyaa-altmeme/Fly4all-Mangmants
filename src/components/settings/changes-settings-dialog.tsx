
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, GitCompareArrows } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { getSettings, updateSettings } from '@/app/settings/actions';
// import type { AppSettings } from '@/lib/types';

export default function ChangesSettingsDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [revenueAccountId, setRevenueAccountId] = useState('');
    const [costAccountId, setCostAccountId] = useState('');

    useEffect(() => {
        if (open) {
            setIsLoading(true);
            // In a real app, you would fetch saved settings
            // getSettings().then(appSettings => {
            //     setRevenueAccountId(appSettings.changesSettings?.revenueAccountId || '');
            //     setCostAccountId(appSettings.changesSettings?.costAccountId || '');
            //     setIsLoading(false);
            // });
            setTimeout(() => setIsLoading(false), 500); // Mock loading
        }
    }, [open]);

    const handleSave = async () => {
        setIsSaving(true);
        // const result = await updateSettings({ 
        //     changesSettings: { revenueAccountId, costAccountId }
        // });
        // MOCK
        const result = { success: true }; 
        if (result.success) {
            toast({ title: "تم حفظ الإعدادات بنجاح" });
            setOpen(false);
        } else {
            toast({ title: "خطأ في الحفظ", variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <div className="flex w-full items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg text-right cursor-pointer h-full">
                    <div className='flex items-center gap-3'>
                        <GitCompareArrows className="h-6 w-6 text-cyan-500" />
                        <div>
                            <p className="font-semibold">إعدادات التغيرات</p>
                            <p className="text-xs text-muted-foreground">تحديد الحسابات المالية للتغيرات والوزن.</p>
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>إعدادات محاسبة التغيرات</DialogTitle>
                    <DialogDescription>
                       حدد الحسابات التي ستُستخدم لتسجيل إيرادات وتكاليف عمليات تغيير التذاكر وشراء الوزن الإضافي.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="revenue-account">حساب إيرادات التغيرات</Label>
                            <Select value={revenueAccountId} onValueChange={setRevenueAccountId}>
                                <SelectTrigger id="revenue-account">
                                    <SelectValue placeholder="اختر حساب..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rev-changes">4002 - إيرادات تغيرات التذاكر</SelectItem>
                                    <SelectItem value="rev-baggage">4003 - إيرادات الوزن الإضافي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cost-account">حساب تكلفة التغيرات</Label>
                             <Select value={costAccountId} onValueChange={setCostAccountId}>
                                <SelectTrigger id="cost-account">
                                    <SelectValue placeholder="اختر حساب..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="exp-changes">5003 - تكلفة تغيرات التذاكر</SelectItem>
                                    <SelectItem value="exp-baggage">5004 - تكلفة الوزن الإضافي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        حفظ الإعدادات
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
