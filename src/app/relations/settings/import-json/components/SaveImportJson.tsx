
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export function SaveImportJson({
  selectedSections,
  data,
}: {
  selectedSections: string[];
  data: Record<string, any[]>;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (selectedSections.length === 0) {
        toast({ title: "لم يتم تحديد أي قسم", description: "الرجاء تحديد قسم واحد على الأقل للاستيراد.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    try {
      for (const section of selectedSections) {
        const records = data[section];
        if (!records?.length) continue;

        // In a real app, this would dispatch actions based on the section name
        console.log(`Saving ${section}:`, records);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      }

      toast({ title: "تم الحفظ بنجاح", description: `تم حفظ الأقسام المحددة.` });
    } catch (e) {
      toast({ title: "خطأ أثناء الحفظ", description: "تحقق من صحة البيانات", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Button onClick={handleSave} className="mt-4" disabled={isSaving}>
      {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
      حفظ جميع البيانات المحددة
    </Button>
  );
}
