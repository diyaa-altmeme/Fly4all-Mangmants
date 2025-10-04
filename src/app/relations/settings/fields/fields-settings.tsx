
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Trash2, PlusCircle, Settings2, ChevronsUpDown, Type, AtSign, Fingerprint, BookUser, GripVertical, CheckSquare, Eye } from 'lucide-react';
import { updateSettings } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import type { CustomRelationField, RelationSection } from '@/lib/types';
import { produce } from 'immer';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const fieldTypes = [
    { value: 'text', label: 'نص', icon: Type },
    { value: 'email', label: 'بريد إلكتروني', icon: AtSign },
    { value: 'number', label: 'رقم', icon: Fingerprint },
    { value: 'textarea', label: 'مربع نص', icon: BookUser },
    { value: 'select', label: 'قائمة منسدلة', icon: ChevronsUpDown },
];

interface FieldSettingsPopoverProps {
    field: CustomRelationField;
    onFieldChange: (updatedField: CustomRelationField) => void;
    onDelete: () => void;
    onSave: () => void;
}

const FieldSettingsPopover = ({ field, onFieldChange, onDelete, onSave }: FieldSettingsPopoverProps) => {
    
    const handleValueChange = (key: keyof CustomRelationField, value: any) => {
        const updatedField = produce(field, draft => {
            (draft as any)[key] = value;
        });
        onFieldChange(updatedField);
    };

    const handleOptionsChange = (index: number, key: 'value' | 'label', value: string) => {
        const newOptions = produce(field.options || [], draft => {
            draft[index][key] = value;
        });
        handleValueChange('options', newOptions);
    };

    const handleAddOption = () => {
        const newOptions = [...(field.options || []), { value: `opt_${Date.now()}`, label: 'خيار جديد' }];
        handleValueChange('options', newOptions);
    };
    
    const handleRemoveOption = (index: number) => {
        const newOptions = (field.options || []).filter((_, i) => i !== index);
        handleValueChange('options', newOptions);
    };

    return (
        <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">إعدادات الحقل: {field.label}</h4>
                </div>
                <div className="grid gap-4">
                    <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <Label htmlFor={`required-${field.id}`} className="flex flex-row items-center gap-2 text-sm">
                               حقل مطلوب
                            </Label>
                            <Switch id={`required-${field.id}`} checked={field.required} onCheckedChange={(c) => handleValueChange('required', c)} />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor={`visible-${field.id}`} className="flex flex-row items-center gap-2 text-sm">
                               حقل مرئي
                            </Label>
                            <Switch id={`visible-${field.id}`} checked={field.visible} onCheckedChange={(c) => handleValueChange('visible', c)} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t">
                        <h5 className="font-semibold text-sm">خصائص متقدمة</h5>
                          <div className="space-y-1.5">
                            <Label>نوع الحقل</Label>
                            <Select value={field.type} onValueChange={(v) => handleValueChange('type', v)} disabled={!field.deletable}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{fieldTypes.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center justify-end gap-2">{t.label}<t.icon className="h-4 w-4"/></div></SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                    </div>
                    
                    {field.type === 'select' && (
                         <div className="space-y-2 pt-3 border-t">
                            <h5 className="font-semibold text-sm">خيارات القائمة</h5>
                             {(field.options || []).map((option, index) => (
                                <div key={index} className="flex items-center gap-1">
                                    <Input placeholder="النص الظاهر" value={option.label} onChange={(e) => handleOptionsChange(index, 'label', e.target.value)} className="h-8"/>
                                    <Input placeholder="القيمة" value={option.value} onChange={(e) => handleOptionsChange(index, 'value', e.target.value)} className="h-8" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => handleRemoveOption(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddOption}><PlusCircle className="me-2 h-4 w-4"/>إضافة خيار</Button>
                        </div>
                    )}
                    
                     <div className="pt-3 border-t space-y-3">
                        {field.deletable && (
                            <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
                               <Trash2 className="me-2 h-4 w-4" /> حذف الحقل بشكل نهائي
                            </Button>
                        )}
                        <Button onClick={onSave} className="w-full"><Save className="me-2 h-4 w-4"/>حفظ إعدادات الحقل</Button>
                    </div>
                </div>
            </div>
        </PopoverContent>
    )
}

interface FieldsSettingsProps {
    relationSections?: RelationSection[];
    onSettingsChanged?: () => void;
}

export default function FieldsSettings({ relationSections: initialSections = [], onSettingsChanged = () => {} }: FieldsSettingsProps) {
    const [sections, setSections] = useState<RelationSection[]>(initialSections);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        setSections(initialSections);
    }, [initialSections]);

    const handleFieldChange = (sectionIndex: number, fieldIndex: number, updatedField: CustomRelationField) => {
        setSections(produce(draft => {
            draft[sectionIndex].fields[fieldIndex] = updatedField;
        }));
    };
    
    const handleAddField = (sectionIndex: number) => {
        const newFieldId = `custom_${Date.now()}`;
        setSections(produce(draft => {
            draft[sectionIndex].fields.push({
                id: newFieldId,
                label: 'حقل جديد',
                type: 'text',
                required: false,
                visible: true,
                deletable: true,
                placeholder: '',
                appliesTo: ['individual', 'company'],
                options: []
            });
        }));
    };

    const handleDeleteField = (sectionIndex: number, fieldIndex: number) => {
        setSections(produce(draft => {
            draft[sectionIndex].fields.splice(fieldIndex, 1);
        }));
    };
    
    const handleSaveLayout = async () => {
        setIsSaving(true);
        const result = await updateSettings({ relationSections: sections });
        if (result.success) {
            toast({ title: 'تم حفظ الواجهة بنجاح' });
            if (onSettingsChanged) onSettingsChanged();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">إدارة حقول العلاقات</h2>
                    <p className="text-sm text-muted-foreground">
                        تحكم كامل في الحقول التي تظهر عند إضافة أو تعديل عميل أو مورد.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                    <Card key={section.id} className="shadow-sm">
                        <CardHeader>
                            <CardTitle>{section.title}</CardTitle>
                            <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           {section.fields.map((field, fieldIndex) => (
                               <Card key={field.id} className="p-4 shadow-inner bg-muted/50">
                                   <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-center">
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>اسم الحقل</Label>
                                                <Input 
                                                    value={field.label} 
                                                    onChange={(e) => handleFieldChange(sectionIndex, fieldIndex, {...field, label: e.target.value})}
                                                    disabled={!field.deletable}
                                                />
                                            </div>
                                             <div className="space-y-1.5">
                                                <Label>النص المؤقت (Placeholder)</Label>
                                                <Input 
                                                    value={field.placeholder || ''} 
                                                    onChange={(e) => handleFieldChange(sectionIndex, fieldIndex, {...field, placeholder: e.target.value})}
                                                />
                                            </div>
                                       </div>
                                       <div className="flex items-center gap-2 pt-6">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm"><Settings2 className="me-2 h-4 w-4"/>خصائص</Button>
                                                </PopoverTrigger>
                                                <FieldSettingsPopover
                                                    field={field}
                                                    onFieldChange={(updatedField) => handleFieldChange(sectionIndex, fieldIndex, updatedField)}
                                                    onDelete={() => handleDeleteField(sectionIndex, fieldIndex)}
                                                    onSave={handleSaveLayout}
                                                />
                                            </Popover>
                                        </div>
                                   </div>
                               </Card>
                            ))}
                        </CardContent>
                        {section.deletable && (
                            <CardFooter>
                                <Button variant="outline" size="sm" onClick={() => handleAddField(sectionIndex)}>
                                    <PlusCircle className="me-2 h-4 w-4"/>
                                    إضافة حقل جديد لهذا القسم
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                ))}
            </div>
             <div className="flex justify-end pt-4 border-t">
                 <Button size="lg" onClick={handleSaveLayout} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ كل التغييرات في الواجهة
                </Button>
            </div>
        </div>
    );
}
