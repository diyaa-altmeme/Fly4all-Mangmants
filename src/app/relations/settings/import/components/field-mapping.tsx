
"use client";

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CustomRelationField, ImportFieldSettings } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

interface FieldMappingProps {
  headers: string[];
  relationFields: CustomRelationField[];
  importFieldsSettings: ImportFieldSettings;
  onMappingDone: (fieldMap: Record<string, string>, newFields: CustomRelationField[]) => void;
}

export default function FieldMapping({ headers, relationFields, importFieldsSettings, onMappingDone }: FieldMappingProps) {
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [newlyCreatedFields, setNewlyCreatedFields] = useState<CustomRelationField[]>([]);
  const { toast } = useToast();

  const allSystemFields = useMemo(() => {
      if (!relationFields) return newlyCreatedFields;
      return [...relationFields, ...newlyCreatedFields];
  }, [relationFields, newlyCreatedFields]);


  const handleFieldMapChange = (header: string, systemFieldId: string) => {
    if (systemFieldId === '__create_new__') {
        const newFieldId = `custom_${header.toLowerCase().replace(/\s+/g, '_')}`;
        if (allSystemFields.some(f => f.id === newFieldId)) {
            toast({ title: "الحقل موجود بالفعل", description: "يوجد حقل مخصص بنفس الاسم.", variant: "destructive" });
            return;
        }

        const newField: CustomRelationField = {
            id: newFieldId,
            label: header,
            type: 'text',
            required: false,
            visible: true,
            deletable: true,
            aliases: [header.toLowerCase()],
            appliesTo: ['individual', 'company'],
        };
        setNewlyCreatedFields(prev => [...prev, newField]);
        setFieldMap(prev => ({ ...prev, [header]: newFieldId }));

    } else {
        setFieldMap(prev => ({ ...prev, [header]: systemFieldId }));
    }
  };

  const processData = () => {
    const isNameMapped = Object.values(fieldMap).includes('name');
    if(!isNameMapped && relationFields.some(f => f.id === 'name')) {
        toast({
            title: "حقل الاسم مطلوب",
            description: "الرجاء ربط أحد أعمدة ملف Excel مع حقل 'الاسم الكامل' للمتابعة.",
            variant: "destructive"
        });
        return;
    }
    
    onMappingDone(fieldMap, newlyCreatedFields);
  };
  
  const autoMapFields = useCallback(() => {
    if (!relationFields) return;
    const newMap: Record<string, string> = {};
    
    relationFields.forEach(field => {
      const fieldSettings = importFieldsSettings[field.id];
      const allPossibleNames = Array.from(new Set([
          field.label.toLowerCase().trim(),
          field.id.toLowerCase().trim(),
          ...(fieldSettings?.aliases || []).map(a => a.toLowerCase().trim())
      ]));
      
      const matchingHeader = headers.find(h => allPossibleNames.includes(h.toLowerCase().trim()));

      if (matchingHeader && !Object.values(newMap).includes(field.id)) {
           newMap[matchingHeader] = field.id;
      }
    });

    setFieldMap(newMap);
     toast({
        title: "تم الربط التلقائي",
        description: `تم ربط ${Object.keys(newMap).length} حقلاً تلقائيًا. الرجاء مراجعة النتائج.`,
    });
  }, [headers, relationFields, toast, importFieldsSettings]);
  
   React.useEffect(() => {
    autoMapFields();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={autoMapFields} variant="outline">إعادة الربط التلقائي</Button>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {headers.map((header) => (
          <div key={header} className="space-y-1">
            <label className="block font-medium text-sm">{header}</label>
            <Select onValueChange={(value) => handleFieldMapChange(header, value)} value={fieldMap[header] || "__ignore__"}>
              <SelectTrigger>
                <SelectValue placeholder="-- اختر الحقل المناسب --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ignore__">-- تجاهل هذا الحقل --</SelectItem>
                <SelectItem value="__create_new__" className="text-green-600 font-bold">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4"/>
                        <span>إنشاء حقل جديد باسم "{header}"</span>
                    </div>
                </SelectItem>
                {allSystemFields.map((f) => (
                    <SelectItem key={f.id} value={f.id} className={newlyCreatedFields.some(nf => nf.id === f.id) ? 'text-green-600' : ''}>
                        {f.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
       <div className="flex justify-center pt-4">
            <Button onClick={processData} size="lg">معالجة البيانات والانتقال للمعاينة</Button>
       </div>
    </div>
  );
}
