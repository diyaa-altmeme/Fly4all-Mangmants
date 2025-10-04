

"use client";

import React, { useState } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import type { Subscription, SubscriptionStatus } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateSubscriptionStatus } from '@/app/subscriptions/actions';

interface UpdateSubscriptionStatusDialogProps {
    subscription: Subscription;
    onStatusChange: () => void;
    children: React.ReactNode;
}

const statusOptions: { value: SubscriptionStatus, label: string }[] = [
    { value: 'Active', label: 'نشط' },
    { value: 'Suspended', label: 'متوقف مؤقتًا' },
    { value: 'Cancelled', label: 'ملغي' },
];

export default function UpdateSubscriptionStatusDialog({ subscription, onStatusChange, children }: UpdateSubscriptionStatusDialogProps) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
    const [reason, setReason] = useState(subscription.cancellationReason || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const showReasonField = status === 'Cancelled' || status === 'Suspended';

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSubscriptionStatus(subscription.id, status, reason);
        if (result.success) {
            toast({ title: 'تم تحديث حالة الاشتراك بنجاح' });
            onStatusChange();
            setOpen(false);
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تغيير حالة الاشتراك</DialogTitle>
                    <DialogDescription>
                        اختر الحالة الجديدة للاشتراك. سيتم تسجيل التاريخ والوقت تلقائيًا.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                        <Label>الحالة الجديدة</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {showReasonField && (
                        <div className="space-y-1.5">
                             <Label>السبب (اختياري)</Label>
                             <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ التغييرات
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
