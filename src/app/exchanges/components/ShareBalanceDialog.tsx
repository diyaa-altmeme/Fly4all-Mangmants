
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareBalanceDialogProps {
  exchangeName: string;
  balance: number;
  children: React.ReactNode;
}

export default function ShareBalanceDialog({ exchangeName, balance, children }: ShareBalanceDialogProps) {
  const { toast } = useToast();
  const balanceText = `رصيد بورصة ${exchangeName}: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  const handleCopy = () => {
    navigator.clipboard.writeText(balanceText);
    toast({ title: 'تم نسخ الرصيد' });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>مشاركة رصيد: {exchangeName}</DialogTitle>
          <DialogDescription>
            يمكنك نسخ النص التالي وإرساله عبر أي تطبيق.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 my-4 bg-muted rounded-lg text-center font-mono font-bold text-lg">
          {balanceText}
        </div>
        <Button onClick={handleCopy} className="w-full">
          <Copy className="me-2 h-4 w-4" />
          نسخ النص
        </Button>
      </DialogContent>
    </Dialog>
  );
}
