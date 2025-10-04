
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Save, Trash2, Settings } from "lucide-react";
import { updateSettings } from "@/app/settings/actions";
import { useToast } from "@/hooks/use-toast";
import { produce } from "immer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RemittanceSettings, RemittanceDistributionColumn } from "@/lib/types";

const ListManager = ({ items, onItemsChange, placeholder }: { items: string[], onItemsChange: (items: string[]) => void, placeholder: string }) => {
    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                    <Input value={item} onChange={(e) => onItemsChange(produce(items, draft => { draft[index] = e.target.value; }))} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => onItemsChange(items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onItemsChange([...items, ''])}><PlusCircle className="me-2 h-4 w-4"/> إضافة {placeholder}</Button>
        </div>
    );
};

interface Props {
  initialSettings: RemittanceSettings;
  onSuccess: () => void;
}

export default function RemittancesSettingsDialog({ initialSettings, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [settings, setSettings] = useState<RemittanceSettings | null>(initialSettings);

  useEffect(() => {
    if (open) {
      setSettings(initialSettings);
    }
  }, [open, initialSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const result = await updateSettings({ remittanceSettings: settings });
    if(result.success) {
      toast({ title: 'تم حفظ الإعدادات' });
      onSuccess();
      setOpen(false);
    } else {
      toast({ title: 'خطأ', description: "Failed to save settings.", variant: 'destructive' });
    }
    setIsSaving(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline"><Settings className="me-2 h-4 w-4"/> الإعدادات</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>إعدادات الحوالات</DialogTitle>
                <DialogDescription>
                    إدارة المكاتب وطرق التحويل وأعمدة توزيع المبالغ المخصصة.
                </DialogDescription>
            </DialogHeader>

            {settings ? (
                <Tabs defaultValue="offices" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="offices">المكاتب</TabsTrigger>
                        <TabsTrigger value="methods">طرق التحويل</TabsTrigger>
                        <TabsTrigger value="dist_usd">توزيع USD</TabsTrigger>
                        <TabsTrigger value="dist_iqd">توزيع IQD</TabsTrigger>
                    </TabsList>
                    <TabsContent value="offices">
                        <ListManager items={settings.offices} onItemsChange={(newItems) => setSettings(s => s ? {...s, offices: newItems.filter(Boolean)} : null)} placeholder="مكتب" />
                    </TabsContent>
                    <TabsContent value="methods">
                        <ListManager items={settings.methods} onItemsChange={(newItems) => setSettings(s => s ? {...s, methods: newItems.filter(Boolean)} : null)} placeholder="طريقة" />
                    </TabsContent>
                    <TabsContent value="dist_usd">
                         <ListManager items={(settings.distributionColumnsUsd || []).map(c => c.label)} onItemsChange={(newItems) => setSettings(s => s ? {...s, distributionColumnsUsd: newItems.filter(Boolean).map((label, i) => ({ id: `usd_col_${i}`, label}))} : null)} placeholder="حقل" />
                    </TabsContent>
                     <TabsContent value="dist_iqd">
                         <ListManager items={(settings.distributionColumnsIqd || []).map(c => c.label)} onItemsChange={(newItems) => setSettings(s => s ? {...s, distributionColumnsIqd: newItems.filter(Boolean).map((label, i) => ({ id: `iqd_col_${i}`, label}))} : null)} placeholder="حقل" />
                    </TabsContent>
                </Tabs>
            ) : <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}

            <DialogFooter>
                <Button onClick={handleSave} disabled={isSaving || !settings}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                    حفظ الإعدادات
                </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
