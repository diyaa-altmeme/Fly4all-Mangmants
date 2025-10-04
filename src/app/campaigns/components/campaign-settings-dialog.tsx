
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import AccountsManager from './accounts-manager';

interface CampaignSettingsDialogProps {
    onSaveSuccess: () => void;
}

export default function CampaignSettingsDialog({ onSaveSuccess }: CampaignSettingsDialogProps) {
    const [open, setOpen] = useState(false);

    const handleSuccess = () => {
        onSaveSuccess();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Settings className="me-2 h-4 w-4" />الإعدادات</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>إعدادات الحملات</DialogTitle>
                    <DialogDescription>
                        إدارة حسابات WhatsApp المتصلة بالنظام.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <AccountsManager onSaveSuccess={handleSuccess} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
