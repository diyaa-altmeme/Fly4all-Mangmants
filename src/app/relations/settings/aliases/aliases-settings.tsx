
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Trash2, PlusCircle, RotateCcw, Info } from 'lucide-react';
import { updateSettings } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, ImportFieldSettings, ImportLogicSettings, CustomRelationField } from '@/lib/types';
import { produce } from 'immer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { defaultSettingsData } from '@/lib/defaults';

const KeywordManager = ({ title, keywords, onKeywordsChange }: { title: string, keywords: string[], onKeywordsChange: (keywords: string[]) => void }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                    <div key={index} className="flex items-center gap-1 p-1 pl-2 rounded-md bg-muted border">
                        <Input
                            value={keyword}
                            onChange={(e) => onKeywordsChange(produce(keywords, draft => { draft[index] = e.target.value; }))}
                            className="h-7 text-sm border-none shadow-none focus-visible:ring-1 bg-transparent"
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onKeywordsChange(keywords.filter((_, i) => i !== index))}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => onKeywordsChange([...keywords.filter(Boolean), ''])}
                >
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
    );
}

interface AliasesSettingsProps {
    settings: AppSettings;
    onSettingsChanged: () => void;
}

export default function AliasesSettings({ settings: initialSettings, onSettingsChanged }: AliasesSettingsProps) {
    const [fieldSettings, setFieldSettings] = useState<ImportFieldSettings>({});
    const [logicSettings, setLogicSettings] = useState<ImportLogicSettings>({ creditKeywords: [], cashKeywords: [] });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const allSystemFields = React.useMemo(() => 
        initialSettings.relationSections?.flatMap(s => s.fields) || [], 
    [initialSettings.relationSections]);

    useEffect(() => {
        const currentFieldSettings = initialSettings.importFieldsSettings || {};
        const populatedFieldSettings = produce(currentFieldSettings, draft => {
            allSystemFields.forEach(field => {
                if (!draft[field.id]) {
                    draft[field.id] = {
                        label: field.label,
                        aliases: field.aliases || [field.label.toLowerCase()],
                    };
                } else {
                     draft[field.id].label = field.label; // Ensure label is up to date
                }
            });
        });
        setFieldSettings(populatedFieldSettings);
        setLogicSettings(initialSettings.importLogicSettings || { cashKeywords: ['cash', 'كاش', 'نقد', 'نقدي'], creditKeywords: ['credit', 'آجل', 'debit', 'دبت'] });
    }, [initialSettings, allSystemFields]);

    const handleSave = async () => {
        const finalFieldSettings = produce(fieldSettings, draft => {
            for (const key in draft) {
                draft[key].aliases = draft[key].aliases.filter(Boolean);
            }
        });
        
        const finalLogicSettings = produce(logicSettings, draft => {
            draft.creditKeywords = draft.creditKeywords.filter(Boolean);
            draft.cashKeywords = draft.cashKeywords.filter(Boolean);
        });
        
        setIsSaving(true);
        const result = await updateSettings({ importFieldsSettings: finalFieldSettings, importLogicSettings: finalLogicSettings });
        if (result.success) {
            toast({ title: 'تم حفظ المرادفات بنجاح' });
            onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: 'لم يتم حفظ المرادفات', variant: 'destructive' });
        }
        setIsSaving(false);
    };
    
    const handleAliasChange = (fieldId: string, index: number, value: string) => {
        setFieldSettings(produce(draft => {
            if (draft?.[fieldId]) {
                draft[fieldId].aliases[index] = value;
            }
        }));
    };
    
    const handleAddAlias = (fieldId: string) => {
        setFieldSettings(produce(draft => {
             if (draft?.[fieldId]) {
                const filteredAliases = draft[fieldId].aliases.filter(Boolean);
                draft[fieldId].aliases = [...filteredAliases, ''];
            }
        }));
    };

    const handleRemoveAlias = (fieldId: string, index: number) => {
         setFieldSettings(produce(draft => {
            if (draft?.[fieldId]) {
                draft[fieldId].aliases.splice(index, 1);
            }
        }));
    }

    const handleKeywordsChange = (type: 'cashKeywords' | 'creditKeywords', keywords: string[]) => {
        setLogicSettings(produce(draft => {
            if (draft) {
                draft[type] = keywords;
            }
        }));
    };
    
    const handleReset = async () => {
        setIsSaving(true);
        const result = await updateSettings({ 
            importFieldsSettings: defaultSettingsData.importFieldsSettings, 
            importLogicSettings: defaultSettingsData.importLogicSettings 
        });
        if (result.success) {
            onSettingsChanged();
            toast({ title: "تمت إعادة التعيين للإعدادات الافتراضية" });
        } else {
            toast({ title: 'خطأ', description: 'لم يتم إعادة التعيين.', variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">مرادفات حقول الاستيراد</h2>
                    <p className="text-sm text-muted-foreground">
                        إدارة الكلمات التي يتعرف عليها النظام لربط الأعمدة وتفسير قيمها عند استيراد ملف Excel.
                    </p>
                </div>
                <AlertDialog>
                     <AlertDialogTrigger asChild>
                        <Button variant="ghost">
                            <RotateCcw className="me-2 h-4 w-4" />
                            إعادة للوضع الافتراضي
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيؤدي هذا إلى حذف جميع المرادفات المخصصة والعودة إلى القائمة الافتراضية.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset}>نعم، قم بإعادة التعيين</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <div className="space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                             <Info className="h-5 w-5"/>
                             إعدادات منطق "نوع التعامل"
                        </CardTitle>
                        <CardDescription>
                            هنا يمكنك تحديد الكلمات التي سيتم تفسيرها على أنها "نقدي" أو "آجل" عند استيراد البيانات.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                       <KeywordManager title="كلمات تعني (نقدي)" keywords={logicSettings.cashKeywords} onKeywordsChange={(k) => handleKeywordsChange('cashKeywords', k)} />
                       <KeywordManager title="كلمات تعني (آجل)" keywords={logicSettings.creditKeywords} onKeywordsChange={(k) => handleKeywordsChange('creditKeywords', k)} />
                    </CardContent>
                </Card>

                {allSystemFields.map(field => (
                    <Card key={field.id}>
                        <CardHeader>
                            <CardTitle>مرادفات حقل: {field.label}</CardTitle>
                            <CardDescription>هذه المرادفات تستخدم لمساعدة النظام في العثور على عنوان العمود الصحيح في ملفك.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                           {(fieldSettings[field.id]?.aliases || []).map((alias, index) => (
                               <div key={index} className="flex items-center gap-1 p-1 pl-2 rounded-md bg-muted border">
                                    <Input
                                        value={alias}
                                        onChange={(e) => handleAliasChange(field.id, index, e.target.value)}
                                        className="h-7 text-sm border-none shadow-none focus-visible:ring-1 bg-transparent"
                                    />
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAlias(field.id, index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                               </div>
                           ))}
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAddAlias(field.id)}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
             <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات
                </Button>
            </div>
        </div>
    );
}
