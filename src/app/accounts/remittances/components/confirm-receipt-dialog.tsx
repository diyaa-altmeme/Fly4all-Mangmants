
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from 'lucide-react';
import { receiveRemittance } from '../actions';
import type { Remittance, Box } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { getBoxes } from '@/app/boxes/actions';

interface ConfirmReceiptDialogProps {
  remittance: Remittance;
  onSuccess: () => void;
}

export default function ConfirmReceiptDialog({ remittance, onSuccess }: ConfirmReceiptDialogProps) {
  const [open, setOpen] = useState(false);
  const [boxId, setBoxId] = useState<string>(remittance.boxId);
  const [isSaving, setIsSaving] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
        getBoxes().then(setBoxes);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!boxId) {
        toast({ title: "الرجاء اختيار الصندوق", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    const result = await receiveRemittance(remittance, boxId);
    if (result.success) {
      toast({ title: "تم استلام الحوالة وتسجيل سند القبض بنجاح" });
      onSuccess();
      setOpen(false);
    } else {
      toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="me-2 h-4 w-4" /> تأكيد الاستلام
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد استلام الحوالة</DialogTitle>
          <DialogDescription>
            سيؤدي هذا الإجراء إلى تغيير حالة الحوالة إلى "مستلمة" وإنشاء سند قبض تلقائي بالمبلغ في الصندوق المحدد.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-1">
                <Label>الصندوق</Label>
                 <Select value={boxId} onValueChange={setBoxId}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر صندوقًا..." />
                    </SelectTrigger>
                    <SelectContent>
                        {boxes.map(box => (
                            <SelectItem key={box.id} value={box.id}>{box.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isSaving || !boxId}>
            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            تأكيد الاستلام
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
