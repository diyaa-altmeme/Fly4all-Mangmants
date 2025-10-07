
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';

// The component is disabled because it relies on a vulnerable package.
// All the logic related to xlsx has been commented out or disabled.

interface FlightDataExtractorDialogProps {
    onSaveSuccess: () => void;
    children: React.ReactNode;
}

export default function FlightDataExtractorDialog({ onSaveSuccess, children }: FlightDataExtractorDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      toast({
        title: "وظيفة معطلة",
        description: "تم تعطيل تحليل بيانات الرحلات من ملفات Excel مؤقتًا بسبب ثغرة أمنية.",
        variant: "destructive",
      });
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl flex flex-col">
        <DialogHeader>
          <DialogTitle>محلل بيانات الطيران</DialogTitle>
          <DialogDescription>
            هذه الميزة معطلة مؤقتًا. لا يتوفر حاليًا تحميل وتحليل ملفات Excel الخاصة بالرحلات.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col items-center justify-center bg-muted/20 rounded-lg p-8">
            <div className="text-center">
                 <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold">وظيفة معطلة</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    تحليل بيانات الرحلات غير متاح بسبب مشكلة أمنية في إحدى الحزم المعتمدة.
                </p>
            </div>
        </div>
         <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">إغلاق</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
