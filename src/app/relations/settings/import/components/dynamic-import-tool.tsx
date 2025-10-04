

"use client";

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CustomRelationField, ImportFieldSettings, ImportLogicSettings, RelationType } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import ImportUpload from './import-upload';
import FieldMapping from './field-mapping';
import ImportPreviewTable from './import-preview-table';
import SaveImport from './save-import';
import { Stepper, StepperItem, useStepper } from '@/components/ui/stepper';
import { Upload, Map, List, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { AppSettings, updateSettings } from '@/app/settings/actions';
import { produce } from 'immer';

const steps = [
    { label: "رفع الملف", icon: <Upload/> },
    { label: "ربط الحقول", icon: <Map/> },
    { label: "معاينة وتعديل", icon: <List/> },
    { label: "الحفظ", icon: <Save/> },
];

const normalizeRecord = (rawRecord: Record<string, any>, fieldMap: Record<string, string>, logicSettings: ImportLogicSettings, relationFields: CustomRelationField[]): Record<string, any> => {
    const normalized: Record<string, any> = {};
  
    relationFields.forEach(field => {
      normalized[field.id] = field.defaultValue || '';
    });
  
    for (const excelHeader in fieldMap) {
      const systemFieldId = fieldMap[excelHeader];
      if (systemFieldId === '__ignore__') continue;
  
      const rawValue = rawRecord[excelHeader];
      const fieldDef = relationFields.find(f => f.id === systemFieldId);
  
      let processedValue: any;
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
          processedValue = fieldDef?.defaultValue || '';
      } else {
          processedValue = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
      }
  
      normalized[systemFieldId] = processedValue;
    }
    
    const paymentValue = String(normalized['paymentType']).toLowerCase();
    if (logicSettings.creditKeywords.map(k => k.toLowerCase()).includes(paymentValue)) {
        normalized['paymentType'] = 'credit';
    } else if (logicSettings.cashKeywords.map(k => k.toLowerCase()).includes(paymentValue)) {
        normalized['paymentType'] = 'cash';
    } else {
        normalized['paymentType'] = 'cash';
    }
    
    const typeValue = String(normalized['type']).toLowerCase();
    if (typeValue === 'company' || typeValue === 'شركة') {
        normalized['type'] = 'company';
    } else {
        normalized['type'] = 'individual';
    }
  
    const relationTypeValue = String(normalized['relationType']).toLowerCase();
    if (['supplier', 'مورد'].includes(relationTypeValue)) {
      normalized['relationType'] = 'supplier';
    } else if (['both', 'كلاهما', 'عميل ومورد'].includes(relationTypeValue)) {
        normalized['relationType'] = 'both';
    } else {
      normalized['relationType'] = 'client';
    }
  
    normalized.status = ['active', 'نشط'].includes(String(normalized.status).toLowerCase()) ? 'active' : 'inactive';
  
    return normalized;
};


export default function DynamicImportTool({ settings }: { settings: AppSettings }) {
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [processedData, setProcessedData] = useState<any[]>([]);
    const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
    const [newFields, setNewFields] = useState<CustomRelationField[]>([]);
    const { toast } = useToast();
    
    const {
        activeStep,
        goToNextStep,
        goToPreviousStep,
        isLastStep,
    } = useStepper({
        initialStep: 0,
        steps: steps,
    });

    const handleDataReady = (data: any[]) => {
        if (data.length === 0) {
            toast({ title: "الملف فارغ أو غير صالح", variant: "destructive" });
            return;
        }
        setRawData(data);
        setHeaders(Object.keys(data[0]));
        goToNextStep();
    };
    
    const handleMappingDone = (map: Record<string, string>, createdFields: CustomRelationField[]) => {
        if (!settings?.importLogicSettings || !settings?.relationSections) {
             toast({ title: "خطأ", description: "لم يتم تحميل إعدادات النظام بشكل صحيح.", variant: "destructive" });
            return;
        }
        
        setFieldMap(map);
        setNewFields(createdFields);

        const allRelationFields = [...settings.relationSections.flatMap(s => s.fields), ...createdFields];
        
        const normalizedData = rawData.map(row => 
            normalizeRecord(row, map, settings.importLogicSettings!, allRelationFields)
        );

        setProcessedData(normalizedData);
        goToNextStep();
    }
    
    const handleUpdateRow = (index: number, updatedRow: any) => {
        const newData = [...processedData];
        newData[index] = updatedRow;
        setProcessedData(newData);
    };

    const handleDeleteRow = (index: number) => {
        setProcessedData(processedData.filter((_, i) => i !== index));
    };

    const handleSaveComplete = async () => {
        if (!settings.relationSections) return;
        
        const updatedOptionsSections = produce(settings.relationSections, draft => {
            const fieldsToUpdate = draft.flatMap(s => s.fields).filter(f => f.type === 'select');
            
            processedData.forEach(row => {
                fieldsToUpdate.forEach(field => {
                    const value = row[field.id];
                    if (value && !field.options?.some(opt => opt.label === value || opt.value === value)) {
                        const newOption = { value, label: value };
                        if(!field.options) field.options = [];
                        field.options.push(newOption);
                    }
                });
            });
        });

        const updatedSectionsWithNewFields = produce(updatedOptionsSections, draft => {
            const otherDetailsSection = draft.find(s => s.id === 'sec_other');
            if (otherDetailsSection && newFields.length > 0) {
                const existingFieldIds = new Set(otherDetailsSection.fields.map(f => f.id));
                const fieldsToAdd = newFields.filter(nf => !existingFieldIds.has(nf.id));
                otherDetailsSection.fields.push(...fieldsToAdd);
            } else if (!otherDetailsSection && newFields.length > 0) {
                draft.push({
                    id: 'sec_other',
                    title: 'تفاصيل أخرى',
                    description: 'حقول إضافية وتفاصيل.',
                    deletable: true,
                    fields: newFields,
                });
            }
        });


        if (JSON.stringify(updatedSectionsWithNewFields) !== JSON.stringify(settings.relationSections)) {
            await updateSettings({ relationSections: updatedSectionsWithNewFields });
            toast({
                title: "تم تحديث إعدادات الحقول",
                description: "تمت إضافة الخيارات والحقول الجديدة من بياناتك المستوردة."
            });
        }
    };
    
    const renderStepContent = () => {
        switch(activeStep) {
            case 0:
                return <ImportUpload onDataReady={handleDataReady} />;
            case 1:
                return <FieldMapping 
                            headers={headers} 
                            onMappingDone={handleMappingDone} 
                            relationFields={settings.relationSections.flatMap(s => s.fields)}
                            importFieldsSettings={settings.importFieldsSettings || {}}
                        />;
            case 2:
                return <ImportPreviewTable 
                            rows={processedData}
                            onRowUpdate={handleUpdateRow}
                            onDeleteRow={handleDeleteRow}
                            fieldMap={fieldMap}
                            relationFields={[...settings.relationSections.flatMap(s => s.fields), ...newFields]}
                        />;
            case 3:
                return <SaveImport 
                            data={processedData}
                            onSaveComplete={handleSaveComplete}
                        />;
            default:
                return null;
        }
    }

     const isNextDisabled = () => {
        if (isLastStep) return true;
        if (activeStep === 0 && rawData.length === 0) return true;
        if (activeStep === 1) return true; // Next step is triggered by button inside component
        if (activeStep === 2 && processedData.length === 0) return true;
        return false;
    }


    return (
        <>
            <div className="mb-8">
                <Stepper activeStep={activeStep}>
                    {steps.map((step, index) => (
                        <StepperItem 
                          key={step.label}
                          label={step.label} 
                          icon={step.icon}
                          isCompleted={activeStep > index}
                          isActive={activeStep === index}
                          isLast={index === steps.length - 1}
                        />
                    ))}
                </Stepper>
            </div>
            
            <div>
                {renderStepContent()}
            </div>

            <div className="flex justify-between mt-8">
                 <Button variant="outline" onClick={goToPreviousStep} disabled={activeStep === 0}>
                    <ArrowRight className="me-2 h-4 w-4" />
                    السابق
                </Button>
                <Button onClick={goToNextStep} disabled={isNextDisabled()}>
                    {isLastStep ? "إنهاء" : "التالي"}
                     <ArrowLeft className="ms-2 h-4 w-4" />
                </Button>
            </div>
        </>
    );
}
