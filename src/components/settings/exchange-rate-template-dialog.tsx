
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquareQuote } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { updateSettings } from '@/app/settings/actions';

interface ExchangeRateTemplateDialogProps {
    initialTemplate?: string;
    onTemplateSaved: () => void;
}

export default function ExchangeRateTemplateDialog({ initialTemplate, onTemplateSaved }: ExchangeRateTemplateDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [template, setTemplate] = useState('');

    useEffect(() => {
        if (open) {
            setTemplate(initialTemplate || "*تحديث سعر الصرف*\\n\\n 1 دولار أمريكي = *{rate}* دينار عراقي\\n\\nتاريخ التحديث: {date}");
        }
    }, [open, initialTemplate]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateSettings({ exchangeRateTemplate: template });
        if (result.success) {
            toast({ title: "تم حفظ القالب بنجاح" });
            onTemplateSaved();
            setOpen(false);
        } else {
            toast({ title: "خطأ في الحفظ", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
             <DialogTrigger asChild>
                <div className="flex w-full items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg text-right cursor-pointer h-full">
                    <div className='flex items-center gap-3'>
                        <MessageSquareQuote className="h-6 w-6 text-indigo-500" />
                        <div>
                            <p className="font-semibold">قالب سعر الصرف</p>
                            <p className="text-xs text-muted-foreground">تعديل رسالة الإشعار لسعر الصرف.</p>
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تعديل قالب رسالة سعر الصرف</DialogTitle>
                    <DialogDescription>
                        عدّل النص الذي سيتم إرساله عبر واتساب. استخدم المتغيرات <code className="font-mono bg-muted px-1 rounded-sm">{'{rate}'}</code> لسعر الصرف و <code className="font-mono bg-muted px-1 rounded-sm">{'{date}'}</code> لتاريخ ووقت التحديث.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-2">
                    <Label htmlFor="template-textarea">نص القالب</Label>
                    <Textarea 
                        id="template-textarea"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={5}
                        className="text-right"
                    />
                </div>
                 <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                        حفظ القالب
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
