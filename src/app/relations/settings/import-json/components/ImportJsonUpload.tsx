
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export function ImportJsonUpload({ onParsed }: { onParsed: (data: any) => void }) {
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onParsed(json);
        toast({ title: "تم قراءة الملف بنجاح" });
      } catch (error) {
        toast({ title: "خطأ في قراءة الملف", description: "تأكد من صيغة JSON", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-2 mt-4">
      <Label htmlFor="json-upload">تحميل ملف JSON</Label>
      <Input id="json-upload" type="file" accept=".json" onChange={handleFileChange} />
    </div>
  );
}
