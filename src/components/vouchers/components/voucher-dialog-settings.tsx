
"use client";

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';
import { NumericInput } from '@/components/ui/numeric-input';
import { RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

type DialogDimensions = { width: string; height: string; };
type Settings = {
    standard_receipt?: DialogDimensions;
    payment_voucher?: DialogDimensions;
    expense_voucher?: DialogDimensions;
    journal_voucher?: DialogDimensions;
    add_relation_dialog?: DialogDimensions;
    add_subscription?: DialogDimensions;
};

interface VoucherDialogSettingsProps {
    dialogKey: keyof Settings;
    children: React.ReactNode;
    onDimensionsChange: (dims: { width: string; height: string }) => void;
}

const defaultDimensions = {
    width: '896px', // Corresponds to sm:max-w-5xl
    height: '80vh',
};


export default function VoucherDialogSettings({ dialogKey, children, onDimensionsChange }: VoucherDialogSettingsProps) {
    const { toast } = useToast();
    const [dimensions, setDimensions] = useState(defaultDimensions);

    const getNumericValue = (value: string) => parseInt(value.replace(/px|vw|vh/g, ''), 10) || 0;

    const loadSettings = () => {
        try {
            const allSettings: Settings = JSON.parse(localStorage.getItem('voucherDialogSettings') || '{}');
            const specificSettings = allSettings[dialogKey];
            const newDimensions = specificSettings || defaultDimensions;
            setDimensions(newDimensions);
            onDimensionsChange(newDimensions);
        } catch(e) {
            setDimensions(defaultDimensions);
            onDimensionsChange(defaultDimensions);
        }
    }
    
    useEffect(() => {
        loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        onDimensionsChange(dimensions);
    }, [dimensions, onDimensionsChange]);

    const handleSave = () => {
        try {
            const allSettings: Settings = JSON.parse(localStorage.getItem('voucherDialogSettings') || '{}');
            const newSettings = { ...allSettings, [dialogKey]: dimensions };
            localStorage.setItem('voucherDialogSettings', JSON.stringify(newSettings));
            toast({ title: 'تم حفظ أبعاد النافذة' });
        } catch (e) {
             toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات', variant: 'destructive' });
        }
    };

    const handleReset = () => {
        setDimensions(defaultDimensions);
        const allSettings: Settings = JSON.parse(localStorage.getItem('voucherDialogSettings') || '{}');
        delete allSettings[dialogKey];
        localStorage.setItem('voucherDialogSettings', JSON.stringify(allSettings));
        toast({ title: 'تمت إعادة تعيين الأبعاد' });
    }

    return (
        <Popover onOpenChange={(open) => open && loadSettings()}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><RotateCcw className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>إعادة تعيين؟</AlertDialogTitle><AlertDialogDescription>هل تريد إعادة الأبعاد للحجم الافتراضي؟</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleReset}>نعم</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <h4 className="font-medium leading-none text-right">أبعاد النافذة</h4>
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                            تحكم في حجم النافذة لتناسب شاشتك.
                        </p>
                    </div>
                    <div className="grid gap-2">
                         <div className="grid grid-cols-3 items-center gap-4">
                            <NumericInput id="width" value={getNumericValue(dimensions.width)} onValueChange={(v) => setDimensions(d => ({...d, width: `${v || 0}px`}))} className="col-span-2 h-8" />
                            <Label htmlFor="width">العرض (px)</Label>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                             <NumericInput id="height" value={getNumericValue(dimensions.height)} onValueChange={(v) => setDimensions(d => ({...d, height: `${v || 0}vh`}))} className="col-span-2 h-8" />
                             <Label htmlFor="height">الارتفاع (vh)</Label>
                        </div>
                        <Button onClick={handleSave} size="sm" className="mt-2">حفظ الأبعاد</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
