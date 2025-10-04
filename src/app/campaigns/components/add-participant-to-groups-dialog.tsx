
"use client";

import React, { useState } from "react";
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
import { Loader2, UserPlus } from "lucide-react";
import type { WhatsappGroup } from "@/lib/types";
import { addWhatsappGroupParticipant } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddParticipantToGroupsDialogProps {
  accountId: string;
  groups: WhatsappGroup[];
}

export default function AddParticipantToGroupsDialog({ accountId, groups }: AddParticipantToGroupsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (!phone) {
      toast({ title: "الرجاء إدخال رقم الهاتف", variant: "destructive" });
      return;
    }
    const formattedPhone = `${phone}@c.us`;
    
    setIsSaving(true);
    toast({ title: "جاري إضافة العضو...", description: `سيتم محاولة إضافة الرقم إلى ${groups.length} مجموعة.` });

    let successCount = 0;
    let errorCount = 0;

    for (const group of groups) {
      const result = await addWhatsappGroupParticipant(accountId, group.id, formattedPhone);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to add to ${group.name}: ${result.error}`);
      }
      // Optional delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsSaving(false);
    toast({
      title: "اكتملت العملية",
      description: `تمت الإضافة بنجاح إلى ${successCount} مجموعة، وفشلت في ${errorCount} مجموعة.`,
    });
    setOpen(false);
    setPhone('');
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="me-2 h-4 w-4" />
          إضافة عضو للمجموعات
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة عضو لكل المجموعات</DialogTitle>
          <DialogDescription>
            أدخل رقم الهاتف وسيتم محاولة إضافته لكل المجموعات التي أنت مشرف عليها.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
            <Label htmlFor="phone">رقم الهاتف (مع كود البلد)</Label>
            <Input 
                id="phone"
                placeholder="مثال: 9647712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving || !phone || groups.length === 0}>
            {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <UserPlus className="me-2 h-4 w-4" />}
            إضافة إلى ({groups.length}) مجموعات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

