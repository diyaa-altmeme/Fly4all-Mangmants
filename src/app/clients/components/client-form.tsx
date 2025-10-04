
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, UseFormReturn, useFieldArray, FieldPath, FieldValues, FormProvider, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, ArrowRight, Settings, PlusCircle, Trash2, KeyRound, Type, ChevronsUpDown, GripVertical, CheckSquare, Eye, Fingerprint, AtSign, BookUser, ToggleRight, MapPin, Phone, Building, Briefcase, User, Settings2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { type Client, type CustomRelationField, type CompanyGroup, type WorkType, type RelationSection, ClientType } from '@/lib/types';
import { addClient, updateClient } from '@/app/clients/actions';
import { updateSettings } from '@/app/settings/actions';
import { Autocomplete } from '@/components/ui/autocomplete';
import { cn } from '@/lib/utils';
import { produce } from 'immer';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { COUNTRIES_DATA } from '@/lib/countries-data';
import { Stepper, StepperItem, useStepper } from '@/components/ui/stepper';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


interface ClientFormProps {
    isEditing?: boolean;
    initialData?: Client;
    relationSections: RelationSection[];
    onSuccess: () => void;
    currentStep?: number;
    setCurrentStep?: (step: number) => void;
    isEditingLayout?: boolean;
}

// Dynamically generate Zod schema from field definitions
const createDynamicSchema = (sections?: RelationSection[], isEditing?: boolean) => {
    if (!sections || !Array.isArray(sections) || sections.length === 0) return z.object({});
    
    const allFields = sections.flatMap(s => s.fields);

    const schemaShape = allFields.reduce((acc, field) => {
        let fieldSchema: z.ZodTypeAny = z.any();
        switch (field.type) {
            case 'email':
                fieldSchema = z.string().email({ message: "بريد إلكتروني غير صحيح" });
                break;
            case 'number':
                fieldSchema = z.coerce.number();
                break;
            default: // text, textarea, select
                fieldSchema = z.string();
        }

        if (field.required) {
            if (['text', 'textarea', 'select'].includes(field.type)) {
                 fieldSchema = fieldSchema.min(1, { message: "هذا الحقل مطلوب" });
            } else if (field.type === 'number') {
                fieldSchema = fieldSchema.min(0.00001, "هذا الحقل مطلوب");
            }
        } else {
            fieldSchema = fieldSchema.optional().or(z.literal(''));
        }

        acc[field.id] = fieldSchema;
        return acc;
    }, {} as Record<string, z.ZodTypeAny>);
    
    return z.object(schemaShape);
};

const fieldTypes = [
    { value: 'text', label: 'نص', icon: Type },
    { value: 'email', label: 'بريد إلكتروني', icon: AtSign },
    { value: 'number', label: 'رقم', icon: Fingerprint },
    { value: 'textarea', label: 'مربع نص', icon: BookUser },
    { value: 'select', label: 'قائمة منسدلة', icon: ChevronsUpDown },
];


const FieldSettingsPopover = ({ field, onFieldChange, onDelete, onSave }: { field: CustomRelationField; onFieldChange: (updatedField: CustomRelationField) => void; onDelete: () => void; onSave: () => void }) => {
    
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
                                    <Input placeholder="القيمة" value={option.value} onChange={(e) => handleOptionsChange(index, 'value', e.target.value)} className="h-8" disabled={!field.deletable && !['paymentType', 'status', 'relationType'].includes(field.id)} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => handleRemoveOption(index)} disabled={!field.deletable}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                             {field.deletable && <Button variant="outline" size="sm" onClick={handleAddOption}><PlusCircle className="me-2 h-4 w-4"/>إضافة خيار</Button>}
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

const RenderField = ({ fieldDef, isEditingLayout, onFieldChange, onDeleteField }: { 
    fieldDef: CustomRelationField;
    isEditingLayout: boolean;
    onFieldChange: (field: CustomRelationField) => void;
    onDeleteField: () => void;
}) => {
    const { control, watch } = useFormContext(); // Use context here
    const selectedCountry = watch('country');

    let options: { value: string; label: string }[] = [];
    if (fieldDef.type === 'select') {
        if (fieldDef.id === 'country') {
            options = COUNTRIES_DATA.map(c => ({ value: c.name, label: c.name}));
        } else if (fieldDef.id === 'province') {
            const countryData = COUNTRIES_DATA.find(c => c.name === selectedCountry);
            options = countryData ? countryData.provinces.map(p => ({ value: p.name, label: p.name })) : [];
        } else {
            options = fieldDef.options || [];
        }
    }
    
    const IconComponent = 
          fieldDef.type === 'email' ? AtSign 
        : fieldDef.type === 'text' && fieldDef.id.includes('phone') ? Phone
        : fieldDef.type === 'select' && fieldDef.id.includes('type') ? Briefcase
        : fieldDef.id.includes('name') ? User
        : Type;
    
    return (
        <FormField
            control={control}
            name={fieldDef.id}
            key={fieldDef.id}
            render={({ field }) => (
                <FormItem className="relative group">
                    {isEditingLayout && (
                        <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6"><Settings2 className="h-4 w-4"/></Button>
                                </PopoverTrigger>
                                <FieldSettingsPopover 
                                    field={fieldDef} 
                                    onFieldChange={onFieldChange} 
                                    onDelete={onDeleteField} 
                                    onSave={() => { /* This is now handled by the parent save */ }} 
                                />
                            </Popover>
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab"/>
                        </div>
                    )}
                     <FormLabel className="flex items-center gap-1">
                        {fieldDef.label}
                        {fieldDef.required && <span className="text-destructive">*</span>}
                    </FormLabel>
                     <FormControl>
                         <div className="relative">
                            <IconComponent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            {fieldDef.type === 'select' ? (
                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={field.id === 'province' && !selectedCountry}>
                                    <SelectTrigger className="pr-10"><SelectValue placeholder={fieldDef.placeholder} /></SelectTrigger>
                                    <SelectContent>{options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            ) : fieldDef.type === 'textarea' ? (
                                <Textarea placeholder={fieldDef.placeholder} {...field} value={field.value || ''} className="pr-10"/>
                            ) : (
                                <Input placeholder={fieldDef.placeholder} type={fieldDef.type} {...field} value={field.value || ''} className="pr-10"/>
                            )}
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export default function ClientForm({ 
    isEditing = false, 
    initialData, 
    relationSections: initialRelationSections,
    onSuccess,
    currentStep = 0,
    setCurrentStep = () => {},
    isEditingLayout = false,
}: ClientFormProps) {
    const { toast } = useToast();
    const [relationSections, setRelationSections] = useState<RelationSection[]>(initialRelationSections || []);
    
    const dynamicSchema = React.useMemo(() => createDynamicSchema(relationSections, isEditing), [relationSections, isEditing]);
    const allFields = React.useMemo(() => relationSections?.flatMap(s => s.fields) || [], [relationSections]);

    const form = useForm<z.infer<typeof dynamicSchema>>({
        resolver: zodResolver(dynamicSchema),
    });
    
    useEffect(() => {
        setRelationSections(initialRelationSections || []);
    }, [initialRelationSections]);
    
     useEffect(() => {
        const defaultValues = allFields.reduce((acc, field) => {
            acc[field.id] = field.defaultValue !== undefined ? field.defaultValue : '';
            return acc;
        }, {} as Record<string, any>);
        
        const initialFormValues = isEditing ? { ...defaultValues, ...initialData } : { ...defaultValues, type: 'individual', status: 'active' };
        
        form.reset(initialFormValues);
    }, [initialData, isEditing, form, allFields]);

    const { formState: { isSubmitting }, control, watch, trigger } = form;
    const entityTypeValue = watch('type');
    
    const handleFieldChange = (sectionIndex: number, fieldIndex: number, updatedField: CustomRelationField) => {
        setRelationSections(produce(draft => {
            draft[sectionIndex].fields[fieldIndex] = updatedField;
        }));
    };

    const handleDeleteField = (sectionIndex: number, fieldIndex: number) => {
        setRelationSections(produce(draft => {
            draft[sectionIndex].fields.splice(fieldIndex, 1);
        }));
    };

    const handleAddField = (sectionIndex: number) => {
        const newFieldId = `custom_${Date.now()}`;
        setRelationSections(produce(draft => {
            draft[sectionIndex].fields.push({
                id: newFieldId,
                label: 'حقل جديد',
                type: 'text',
                required: false,
                visible: true,
                deletable: true,
                placeholder: '',
                appliesTo: ['individual', 'company'],
                aliases: [],
                options: []
            });
        }));
    };

    const handleSaveLayout = async () => {
        setIsSaving(true);
        const result = await updateSettings({ relationSections: relationSections });
        if (result.success) {
            toast({ title: 'تم حفظ الواجهة بنجاح' });
            if (onSuccess) onSuccess(); // To refresh data on parent
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const [isSaving, setIsSaving] = React.useState(false);
    
    const getVisibleFields = useCallback((section: RelationSection, currentEntityType: ClientType | '') => {
        if (!section || !section.fields || !Array.isArray(section.fields)) return [];
        return section.fields.filter(field => {
            if(field.id === 'type') return false;
            if (!isEditingLayout && !field.visible) return false;
            if (currentEntityType && field.appliesTo && field.appliesTo.length > 0) {
                 return field.appliesTo.includes(currentEntityType);
            }
            return true;
        });
    }, [isEditingLayout]);
    
    const formSteps = React.useMemo(() => {
        const sections = relationSections || [];
        if (!Array.isArray(sections)) return [];

        const basicSection = sections.find(s => s.id === 'sec_basic');
        const otherSections = sections.filter(s => s.id !== 'sec_basic');
        
        return [
            basicSection,
            { id: 'sec_other_details', title: 'باقي التفاصيل', description: 'معلومات الاتصال، تفاصيل الشركة، وأي بيانات أخرى.', deletable: false, fields: otherSections.flatMap(s => s.fields) }
        ].filter(Boolean) as RelationSection[];
    }, [relationSections]);
    
    const currentSection = formSteps[currentStep];

    const handleNext = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const fieldsToValidate = getVisibleFields(currentSection, entityTypeValue).map(f => f.id as FieldPath<FieldValues>);
        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => prev + 1);
        }
    };
    
    const handlePrev = () => setCurrentStep(prev => prev - 1);
    
    const onSubmit = async (values: z.infer<typeof dynamicSchema>) => {
        const result = isEditing && initialData ? await updateClient(initialData.id, values) : await addClient(values);
        if (result.success) {
            toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} الحساب بنجاح` });
            onSuccess();
        } else {
            toast({ title: "خطأ", description: result.error, variant: "destructive" });
        }
    };

    const renderFormSection = useCallback((section: RelationSection, sectionIndex: number) => {
        const visibleFields = getVisibleFields(section, entityTypeValue);
        if (visibleFields.length === 0 && !isEditingLayout) return null;
        
        const IconComponent = 
              section.id === 'sec_basic' ? User
            : section.id === 'sec_contact' ? Phone
            : section.id === 'sec_company' ? Building
            : section.id === 'sec_login' ? KeyRound
            : Settings;

        return (
            <Card key={section.id} className={cn("shadow-sm", isEditingLayout ? "border-primary border-2" : "")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                         <IconComponent className="h-5 w-5 text-primary"/>
                        {section.title}
                    </CardTitle>
                    {section.description && <CardDescription>{section.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className={cn("grid grid-cols-1 gap-x-4 gap-y-5", isEditingLayout ? "" : "sm:grid-cols-2")}>
                        {getVisibleFields(section, entityTypeValue).map((field, fieldIndex) => (
                            <div key={field.id} className={cn((field.type === 'textarea' || ['name'].includes(field.id)) && 'md:col-span-2' )}>
                                <RenderField 
                                    fieldDef={field}
                                    isEditingLayout={isEditingLayout}
                                    onFieldChange={(updatedField) => handleFieldChange(sectionIndex, fieldIndex, updatedField)}
                                    onDeleteField={() => handleDeleteField(sectionIndex, fieldIndex)}
                                />
                            </div>
                        ))}
                    </div>
                     {isEditingLayout && section.deletable && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddField(sectionIndex)}>
                            <PlusCircle className="me-2 h-4 w-4"/>
                            إضافة حقل جديد
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }, [relationSections, getVisibleFields, form, entityTypeValue, isEditingLayout, handleFieldChange, handleDeleteField, handleAddField]);
    
    if (isEditingLayout) {
        return (
            <FormProvider {...form}>
                <div className="p-6 space-y-4">
                    {relationSections.map((section, index) => renderFormSection(section, index))}
                    <div className="flex justify-end pt-4 border-t">
                        <Button size="lg" onClick={handleSaveLayout} disabled={isSaving}>
                            {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <Save className="me-2 h-4 w-4" />
                            حفظ التعديلات في الواجهة
                        </Button>
                    </div>
                </div>
            </FormProvider>
        )
    }
    
    if (isEditing) {
        return (
             <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
                    {relationSections.map((section, index) => renderFormSection(section, index))}
                    
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4"/>}
                            حفظ التعديلات
                        </Button>
                    </div>
                </form>
            </FormProvider>
        );
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                 <div className="p-6">
                    <Stepper activeStep={currentStep}>
                        {formSteps.map((step, index) => (
                            <StepperItem key={step.id} label={step.title} isCompleted={currentStep > index} isActive={currentStep === index} isLast={index === formSteps.length - 1} />
                        ))}
                    </Stepper>
                </div>
                <div className="px-6 pb-6 flex-grow overflow-y-auto">
                     {currentStep === 0 && currentSection && (
                         <div className="space-y-6">
                             <div className="space-y-2">
                                <Label>نوع الجهة</Label>
                                <Controller
                                    name="type"
                                    control={form.control}
                                    render={({ field }) => (
                                         <div className="grid grid-cols-2 gap-2">
                                             <Button type="button" variant={field.value === 'individual' ? 'default' : 'outline'} onClick={() => field.onChange('individual')} className="h-20 flex-col gap-2"><User className="h-8 w-8"/><span>فرد</span></Button>
                                             <Button type="button" variant={field.value === 'company' ? 'default' : 'outline'} onClick={() => field.onChange('company')} className="h-20 flex-col gap-2"><Building className="h-8 w-8"/><span>شركة</span></Button>
                                         </div>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                                {getVisibleFields(currentSection, entityTypeValue).map((field, fieldIndex) => (
                                    <div key={field.id} className={cn(['name'].includes(field.id) && 'sm:col-span-2')}>
                                        <RenderField
                                            fieldDef={field}
                                            isEditingLayout={false}
                                            onFieldChange={(updatedField) => handleFieldChange(0, fieldIndex, updatedField)}
                                            onDeleteField={() => handleDeleteField(0, fieldIndex)}
                                        />
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            {relationSections.filter(s => s.id !== 'sec_basic').map((section, index) => renderFormSection(section, index + 1))}
                        </div>
                    )}
                </div>
                 <div className="flex justify-between items-center gap-2 p-4 border-t sticky bottom-0 bg-background mt-auto">
                    <Button type="button" variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                        <ArrowRight className="me-2 h-4 w-4" /> السابق
                    </Button>
                    {currentStep < formSteps.length - 1 ? (
                        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                            التالي <ArrowLeft className="ms-2 h-4 w-4" />
                        </Button>
                    ) : (
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : <Save className="me-2 h-4 w-4"/>}
                            {isEditing ? 'حفظ التعديلات' : 'حفظ'}
                        </Button>
                    )}
                </div>
            </form>
        </FormProvider>
    );
}
