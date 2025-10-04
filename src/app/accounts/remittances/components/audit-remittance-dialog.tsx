
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
import { Loader2, ShieldCheck } from 'lucide-react';
import { auditRemittance } from '../actions';
import type { Remittance } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AuditRemittanceDialogProps {
  remittance: Remittance;
  onSuccess: () => void;
}

export default function AuditRemittanceDialog({ remittance, onSuccess }: AuditRemittanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleAudit = async () => {
    setIsSaving(true);
    const result = await auditRemittance(remittance.id, auditNotes);
    if (result.success) {
      toast({ title: "تم تدقيق الحوالة بنجاح" });
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
        <Button variant="outline" size="sm">
          <ShieldCheck className="me-2 h-4 w-4" /> تدقيق
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تدقيق الحوالة</DialogTitle>
          <DialogDescription>
            تأكيد صحة بيانات الحوالة قبل إرسالها للاستلام.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="audit-notes">ملاحظات التدقيق (اختياري)</Label>
            <Textarea 
              id="audit-notes" 
              value={auditNotes} 
              onChange={(e) => setAuditNotes(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAudit} disabled={isSaving}>
            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            تأكيد التدقيق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
