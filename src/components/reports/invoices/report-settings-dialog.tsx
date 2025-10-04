

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
import { Settings, SlidersHorizontal, Printer, View, Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReportSettings } from '@/lib/types';
import { produce } from 'immer';
import { useToast } from '@/hooks/use-toast';
import { NumericInput } from '@/components/ui/numeric-input';
import { RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';


interface ReportSettingsDialogProps {
  initialSettings: ReportSettings;
  onSettingsChanged: (settings: ReportSettings) => void;
}


export default function ReportSettingsDialog({ initialSettings, onSettingsChanged }: ReportSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if(open) {
      setSettings(initialSettings);
    }
  }, [open, initialSettings]);


  const handleDisplayChange = (key: keyof ReportSettings['display'], value: boolean | string) => {
      setSettings(produce(draft => {
          (draft.display as any)[key] = value;
      }));
  }
  
  const handleFieldVisibilityChange = (fieldId: string, checked: boolean) => {
      setSettings(produce(draft => {
          const field = draft.display.fields.find(f => f.id === fieldId);
          if (field) {
              field.visible = checked;
          }
      }));
  }

  const handlePrintChange = (key: keyof ReportSettings['print'], value: any) => {
       setSettings(produce(draft => {
          (draft.print as any)[key] = value;
      }));
  }
  
  const handleSave = () => {
    setIsSaving(true);
    try {
        localStorage.setItem('invoiceReportSettings', JSON.stringify(settings));
        onSettingsChanged(settings);
        toast({ title: "تم حفظ الإعدادات" });
        setOpen(false);
    } catch(e) {
        toast({ title: "خطأ", description: "لم يتم حفظ الإعدادات.", variant: "destructive" });
    }
    setIsSaving(false);
  }
  
  const handleReset = () => {
      // Need to define default settings
      const defaultSettings = {
        display: { sortBy: 'invoiceDate', fields: [], showCreationDate: true, showPassport: true, showPassenger: true, showVisaType: true, showRoute: true, showAccountInPrint: true, showVL: false, showFare: false },
        print: { showSalePrice: true, showPurchasePrice: false, sequenceField: 'list', convertToCurrency: null },
        dimensions: { width: '95vw', height: '95vh' }
      };
      setSettings(defaultSettings as any);
      localStorage.removeItem('invoiceReportSettings');
      toast({ title: 'تمت استعادة الإعدادات الافتراضية' });
  }

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="p-0 flex flex-col max-h-[95vh]"
        style={{ 
            width: settings.dimensions.width, 
            height: settings.dimensions.height,
            resize: 'both',
            overflow: 'auto',
            maxWidth: '95vw',
            maxHeight: '95vh',
        }}
      >
        <DialogHeader className="p-4 border-b text-right">
          <DialogTitle>إعدادات وفلاتر كشف الفواتير</DialogTitle>
          <DialogDescription>
            تحكم في طريقة عرض وطباعة وتصفية البيانات في التقرير.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <Tabs defaultValue="display" className="p-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="display"><View className="ms-2 h-4 w-4"/>عرض البيانات</TabsTrigger>
              <TabsTrigger value="print"><Printer className="ms-2 h-4 w-4"/>عرض الطباعة</TabsTrigger>
              <TabsTrigger value="filters"><Settings className="ms-2 h-4 w-4"/>إعدادات وفلاتر</TabsTrigger>
            </TabsList>
            
            <TabsContent value="display" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-semibold">الفرز حسب تاريخ</h4>
                  <RadioGroup value={settings.display.sortBy} onValueChange={(v) => handleDisplayChange('sortBy', v)} dir="rtl">
                    <div className="flex items-center gap-2"><RadioGroupItem value="invoiceDate" id="date-invoice" /><Label htmlFor="date-invoice">تاريخ الفاتورة</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="saveDate" id="date-save" /><Label htmlFor="date-save">تاريخ الحفظ</Label></div>
                  </RadioGroup>
                  <div className="flex items-center gap-2 pt-2"><Checkbox id="show-creation-date" checked={settings.display.showCreationDate} onCheckedChange={(c) => handleDisplayChange('showCreationDate', !!c)} /><Label htmlFor="show-creation-date">إظهار تاريخ الإنشاء</Label></div>
                </div>
                 <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold mb-2">إعدادات عرض معلومات القوائم</h4>
                    <div className="flex items-center gap-2"><Checkbox id="show-passport" checked={settings.display.showPassport} onCheckedChange={(c) => handleDisplayChange('showPassport', !!c)} /><Label htmlFor="show-passport">عرض رقم الجواز</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-passenger" checked={settings.display.showPassenger} onCheckedChange={(c) => handleDisplayChange('showPassenger', !!c)} /><Label htmlFor="show-passenger">عرض اسم المسافر</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-visa" checked={settings.display.showVisaType} onCheckedChange={(c) => handleDisplayChange('showVisaType', !!c)} /><Label htmlFor="show-visa">عرض نوع الفيزا</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-route" checked={settings.display.showRoute} onCheckedChange={(c) => handleDisplayChange('showRoute', !!c)} /><Label htmlFor="show-route">عرض نوع الرحلة</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-account" checked={settings.display.showAccountInPrint} onCheckedChange={(c) => handleDisplayChange('showAccountInPrint', !!c)} /><Label htmlFor="show-account">عرض الحساب في الطباعة</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-vl" checked={settings.display.showVL} onCheckedChange={(c) => handleDisplayChange('showVL', !!c)} /><Label htmlFor="show-vl">عرض V.L الخاص بالتذكرة</Label></div>
                    <div className="flex items-center gap-2"><Checkbox id="show-fare" checked={settings.display.showFare} onCheckedChange={(c) => handleDisplayChange('showFare', !!c)} /><Label htmlFor="show-fare">عرض Fare الخاص بالتذكرة</Label></div>
                 </div>
              </div>
               <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-4">حقول العرض في الجدول</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {settings.display.fields.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <Label htmlFor={`switch-${field.id}`}>{field.label}</Label>
                            <Switch id={`switch-${field.id}`} checked={field.visible} onCheckedChange={(c) => handleFieldVisibilityChange(field.id, c)} />
                        </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="print" className="mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-semibold">أسعار الطباعة</h4>
                        <div className="flex items-center justify-between"><Label>مبيع</Label><Switch checked={settings.print.showSalePrice} onCheckedChange={(c) => handlePrintChange('showSalePrice', c)} /></div>
                        <div className="flex items-center justify-between"><Label>شراء</Label><Switch checked={settings.print.showPurchasePrice} onCheckedChange={(c) => handlePrintChange('showPurchasePrice', c)} /></div>
                     </div>
                      <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-semibold">طباعة حقل التسلسل</h4>
                        <RadioGroup value={settings.print.sequenceField} onValueChange={(v) => handlePrintChange('sequenceField', v)} dir="rtl">
                            <div className="flex items-center gap-2"><RadioGroupItem value="list" id="print-list" /><Label htmlFor="print-list">تسلسل القائمة</Label></div>
                            <div className="flex items-center gap-2"><RadioGroupItem value="general" id="print-general" /><Label htmlFor="print-general">الرقم العام</Label></div>
                            <div className="flex items-center gap-2"><RadioGroupItem value="voucher" id="print-voucher" /><Label htmlFor="print-voucher">فاوجر</Label></div>
                        </RadioGroup>
                      </div>
                </div>
                 <div className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-semibold">تحويل الكشف الى عملة</h4>
                     <div className="flex items-center gap-4">
                        <Select dir="rtl" value={settings.print.convertToCurrency || 'none'} onValueChange={(v) => handlePrintChange('convertToCurrency', v === 'none' ? null : v)}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">بدون تحويل</SelectItem>
                                <SelectItem value="USD">Dollar</SelectItem>
                                <SelectItem value="IQD">Dinar</SelectItem>
                            </SelectContent>
                        </Select>
                        <Checkbox checked={!!settings.print.convertToCurrency} onCheckedChange={(c) => handlePrintChange('convertToCurrency', c ? 'USD' : null)} />
                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="filters" className="mt-4 space-y-4">
                <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">أبعاد النافذة</h4>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" size="sm">
                                    <RotateCcw className="me-2 h-4 w-4"/> إعادة للوضع الافتراضي
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription>سيتم إعادة أبعاد النافذة إلى الحجم الافتراضي.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReset}>نعم، قم بالإعادة</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="dialogWidth">عرض النافذة</Label>
                            <Input id="dialogWidth" value={settings.dimensions.width} onChange={e => setSettings(d => ({...d, dimensions: {...d.dimensions, width: e.target.value}}))} placeholder="مثال: 1000px أو 80vw" />
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="dialogHeight">ارتفاع النافذة</Label>
                            <Input id="dialogHeight" value={settings.dimensions.height} onChange={e => setSettings(d => ({...d, dimensions: {...d.dimensions, height: e.target.value}}))} placeholder="مثال: 800px أو 90vh" />
                        </div>
                    </div>
                </div>
                <p className="text-muted-foreground text-center p-8">سيتم إضافة المزيد من الفلاتر والإعدادات هنا قريبًا.</p>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            حفظ الإعدادات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
