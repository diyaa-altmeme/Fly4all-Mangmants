
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, SlidersHorizontal, Columns, Trash, PlusCircle, Settings2, Combine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { produce } from 'immer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReconciliationSettings, MatchingField } from '@/lib/reconciliation';
import { defaultSettings } from '@/lib/reconciliation';


const SectionCard = ({ icon: Icon, title, description, children }: { icon: React.ElementType, title: string, description: string, children: React.ReactNode }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start gap-4">
            <Icon className="h-8 w-8 text-primary mt-1" />
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {children}
        </CardContent>
    </Card>
);

type MatchingRule = 
  | { type: 'exact' }
  | { type: 'fuzzy', tolerance: number }
  | { type: 'numeric_diff', maxDiff: number };

const FieldRuleEditor = ({ field, onFieldChange }: { field: MatchingField, onFieldChange: (field: MatchingField) => void }) => {
    
    const handleRuleTypeChange = (type: 'exact' | 'fuzzy' | 'numeric_diff') => {
        let newRule: MatchingRule;
        switch(type) {
            case 'fuzzy': newRule = { type, tolerance: 85 }; break;
            case 'numeric_diff': newRule = { type, maxDiff: 1 }; break;
            default: newRule = { type: 'exact' }; break;
        }
        onFieldChange({ ...field, rule: newRule });
    };

    const handleToleranceChange = (value: number) => {
        if (field.rule.type === 'fuzzy') {
            onFieldChange({ ...field, rule: { ...field.rule, tolerance: value } });
        }
    };
    
    const handleMaxDiffChange = (value: number) => {
         if (field.rule.type === 'numeric_diff') {
            onFieldChange({ ...field, rule: { ...field.rule, maxDiff: value } });
        }
    }

    return (
        <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">إعدادات حقل: {field.label}</h4>
                    <p className="text-sm text-muted-foreground">
                        تحديد كيفية مقارنة هذا الحقل.
                    </p>
                </div>
                 <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="rule-type">نوع القاعدة</Label>
                         <Select value={field.rule.type} onValueChange={handleRuleTypeChange as any}>
                            <SelectTrigger id="rule-type" className="col-span-2 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="exact">تطابق تام</SelectItem>
                                {field.dataType === 'string' && <SelectItem value="fuzzy">تطابق تقريبي (نص)</SelectItem>}
                                {field.dataType === 'number' && <SelectItem value="numeric_diff">فرق رقمي</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    {field.rule.type === 'fuzzy' && (
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="tolerance">نسبة التشابه</Label>
                             <div className="col-span-2 flex items-center gap-2">
                                <Slider id="tolerance" value={[field.rule.tolerance]} onValueChange={([v]) => handleToleranceChange(v)} min={50} max={100} step={5} />
                                <span className="text-xs font-mono">{field.rule.tolerance}%</span>
                            </div>
                        </div>
                    )}
                    {field.rule.type === 'numeric_diff' && (
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="max-diff">أقصى فرق مسموح به</Label>
                            <Input id="max-diff" type="text" inputMode="decimal" value={field.rule.maxDiff} onChange={e => handleMaxDiffChange(parseFloat(e.target.value) || 0)} className="col-span-2 h-8"/>
                        </div>
                    )}
                </div>
            </div>
        </PopoverContent>
    );
};


interface ReconciliationSettingsContentProps {
    initialSettings: ReconciliationSettings;
    onSettingsSaved: () => void;
}

export default function ReconciliationSettingsContent({ initialSettings, onSettingsSaved }: ReconciliationSettingsContentProps) {
    const [settings, setSettings] = useState<ReconciliationSettings>(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [newFieldName, setNewFieldName] = useState('');

     useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);


    const handleSave = () => {
        setIsSaving(true);
        try {
            settings.matchingFields.forEach(field => {
                if (!settings.columnMapping.company[field.id]) settings.columnMapping.company[field.id] = '';
                if (!settings.columnMapping.supplier[field.id]) settings.columnMapping.supplier[field.id] = '';
            });
            localStorage.setItem('reconciliationSettings', JSON.stringify(settings));
            toast({ title: "تم حفظ الإعدادات بنجاح" });
            onSettingsSaved();
        } catch (error) {
            toast({ title: "خطأ", description: "لم يتم حفظ الإعدادات.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleReset = () => {
        setSettings(defaultSettings);
        localStorage.removeItem('reconciliationSettings');
        onSettingsSaved();
        toast({ title: "تمت إعادة تعيين الإعدادات" });
    };

    const handleFieldChange = <K extends keyof MatchingField>(index: number, key: K, value: MatchingField[K]) => {
        setSettings(produce(draft => {
            draft.matchingFields[index][key] = value;
        }));
    };

    const handleColumnMappingChange = (source: 'company' | 'supplier', fieldId: string, value: string) => {
        setSettings(produce(draft => {
            draft.columnMapping[source][fieldId] = value;
        }));
    };

    const handleAggregationChange = <K extends keyof ReconciliationSettings['aggregation']>(key: K, value: ReconciliationSettings['aggregation'][K]) => {
         setSettings(produce(draft => {
            draft.aggregation[key] = value;
        }));
    }

    const handleAddNewField = () => {
        if (!newFieldName.trim()) {
            toast({ title: "اسم الحقل مطلوب", variant: "destructive" }); return;
        }
        const newFieldId = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
        if (settings.matchingFields.some(f => f.id === newFieldId)) {
            toast({ title: "الحقل موجود بالفعل", variant: "destructive" }); return;
        }
        setSettings(produce(draft => {
            draft.matchingFields.push({ id: newFieldId, label: newFieldName, enabled: true, deletable: true, dataType: 'string', rule: { type: 'exact' } });
        }));
        setNewFieldName('');
    };

    const handleDeleteField = (fieldId: string) => {
        setSettings(produce(draft => {
            draft.matchingFields = draft.matchingFields.filter(f => f.id !== fieldId);
        }));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                 <div className="lg:col-span-2">
                    <SectionCard
                        icon={Columns}
                        title="تحديد أسماء الأعمدة"
                        description="اربط أسماء الأعمدة في ملفاتك بالأسماء المعتمدة في النظام."
                    >
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الاسم الداخلي</TableHead>
                                        <TableHead>اسم العمود في ملف الشركة</TableHead>
                                        <TableHead>اسم العمود في ملف المورد</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settings.matchingFields.map(field => (
                                        <TableRow key={`mapping-${field.id}`}>
                                            <TableCell className="font-semibold">{field.label}</TableCell>
                                            <TableCell>
                                                <Input value={settings.columnMapping.company[field.id] || ''} onChange={(e) => handleColumnMappingChange('company', field.id, e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={settings.columnMapping.supplier[field.id] || ''} onChange={(e) => handleColumnMappingChange('supplier', field.id, e.target.value)} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </SectionCard>
                </div>

                <SectionCard
                    icon={SlidersHorizontal}
                    title="حقول وقواعد المطابقة"
                    description="تحكم في دقة عملية المطابقة والحقول المستخدمة فيها."
                >
                     <div className="space-y-3">
                         {settings.matchingFields.map((field, index) => (
                             <div key={field.id} className="flex items-center justify-between rounded-lg p-2 border gap-4">
                                <Input value={field.label} onChange={(e) => handleFieldChange(index, 'label', e.target.value)} className="font-semibold border-none focus-visible:ring-0 shadow-none flex-grow"/>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-5 w-5" /></Button>
                                        </PopoverTrigger>
                                        <FieldRuleEditor field={field} onFieldChange={(updatedField) => handleFieldChange(index, 'rule', updatedField.rule)} />
                                    </Popover>
                                    {field.deletable && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteField(field.id)}>
                                            <Trash className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <Switch id={`use-${field.id}`} checked={field.enabled} onCheckedChange={(c) => handleFieldChange(index, 'enabled', c)} />
                                </div>
                             </div>
                         ))}
                         <div className="flex items-center gap-2 pt-4 border-t">
                             <Input 
                                placeholder="اسم الحقل الجديد..." 
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                            />
                             <Button size="icon" onClick={handleAddNewField}><PlusCircle className="h-5 w-5" /></Button>
                         </div>
                    </div>
                </SectionCard>
                 <SectionCard
                    icon={Combine}
                    title="سياسات التجميع والتجزئة"
                    description="معالجة حالات وجود سجل واحد في كشفك مقابل عدة سجلات مجزأة في كشف المورد."
                >
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="enable-aggregation" className="font-semibold">تفعيل تجميع السجلات المجزأة في كشف المورد</Label>
                        <Switch id="enable-aggregation" checked={settings.aggregation.enabled} onCheckedChange={(c) => handleAggregationChange('enabled', c)} />
                    </div>
                    {settings.aggregation.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-4">
                             <div className="space-y-2">
                                <Label>حقل التجميع (المفتاح)</Label>
                                <Select value={settings.aggregation.aggregationKey} onValueChange={(v) => handleAggregationChange('aggregationKey', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {settings.matchingFields.map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">العمود الذي سيتم تجميع السجلات بناءً عليه (مثل BNR).</p>
                            </div>
                            <div className="space-y-2">
                                <Label>حقل القيمة (للجمع)</Label>
                                 <Select value={settings.aggregation.aggregationValueField} onValueChange={(v) => handleAggregationChange('aggregationValueField', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {settings.matchingFields.filter(f => f.dataType === 'number').map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">العمود الرقمي الذي سيتم جمعه (مثل السعر).</p>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={handleReset}>
                    <Trash className="me-2 h-4 w-4" />
                    إعادة تعيين للإعدادات الافتراضية
                </Button>
                <Button size="lg" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    <Save className="me-2 h-4 w-4" />
                    حفظ الإعدادات
                </Button>
            </div>
        </div>
    );
}
