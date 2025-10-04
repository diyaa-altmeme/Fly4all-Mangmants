
"use client";

import React, { useState, useEffect } from "react";
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
import { Settings, Save, RotateCcw, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { produce } from "immer";
import type { VoucherListSettings, VoucherTableColumn } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


interface VouchersListSettingsDialogProps {
  settings: VoucherListSettings;
  onSettingsChanged: (settings: VoucherListSettings) => void;
}

export default function VouchersListSettingsDialog({ settings: initialSettings, onSettingsChanged }: VouchersListSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<VoucherListSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(initialSettings);
    }
  }, [open, initialSettings]);

  const handleSave = () => {
    onSettingsChanged(settings);
    setOpen(false);
  };
  
  const handleVisibilityChange = (id: string, checked: boolean) => {
    setSettings(produce(draft => {
      const column = draft.columns.find(c => c.id === id);
      if (column) column.visible = checked;
    }));
  };
  
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= settings.columns.length) return;
    
    setSettings(produce(draft => {
      const [movedItem] = draft.columns.splice(fromIndex, 1);
      draft.columns.splice(toIndex, 0, movedItem);
    }));
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>إعدادات عرض جدول السندات</DialogTitle>
          <DialogDescription>
            تحكم في الأعمدة الظاهرة وترتيبها في جدول السجلات.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-3 -mr-6">
            <div className="space-y-2">
                {settings.columns.map((column, index) => (
                    <div
                        key={column.id}
                        className="flex items-center justify-between p-2 border rounded-lg bg-muted/50"
                    >
                        <div className="flex items-center gap-2">
                             <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveItem(index, index - 1)}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveItem(index, index + 1)}
                                  disabled={index === settings.columns.length - 1}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                             <Label className="font-semibold">{column.label}</Label>
                        </div>
                         <Switch
                            checked={column.visible}
                            onCheckedChange={(checked) => handleVisibilityChange(column.id, checked)}
                            disabled={column.id === 'actions'} // Actions column cannot be hidden
                         />
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
            <Button onClick={handleSave}>
                <Save className="me-2 h-4 w-4" /> حفظ الإعدادات
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
