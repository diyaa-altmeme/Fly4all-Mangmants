
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Upload, List, CheckSquare } from 'lucide-react';
import { ImportJsonUpload } from '@/app/relations/settings/import-json/components/ImportJsonUpload';
import { ImportSectionSelector } from '@/app/relations/settings/import-json/components/ImportSectionSelector';
import { ImportDataPreview } from '@/app/relations/settings/import-json/components/ImportDataPreview';
import { SaveImportJson } from '@/app/relations/settings/import-json/components/SaveImportJson';

export default function ImportJsonTool() {
    const [jsonData, setJsonData] = useState<Record<string, any[]> | null>(null);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    
    const handleParsedData = (data: any) => {
        setJsonData(data);
        setSelectedSections(Object.keys(data)); // Select all by default
    };

    const previewData = useMemo(() => {
        if (!jsonData || selectedSections.length === 0) return null;
        const dataToShow: Record<string, any[]> = {};
        for (const section of selectedSections) {
            if (jsonData[section]) {
                dataToShow[section] = jsonData[section];
            }
        }
        return dataToShow;
    }, [jsonData, selectedSections]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        الخطوة 1: رفع ملف JSON
                    </CardTitle>
                    <CardDescription>
                        ارفع ملف JSON يحتوي على البيانات التي ترغب في استيرادها. يجب أن يكون الملف مقسماً إلى كائنات تمثل أنواع البيانات (مثل: clients, suppliers).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ImportJsonUpload onParsed={handleParsedData} />
                </CardContent>
            </Card>

            {jsonData && (
                <>
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <CheckSquare className="h-5 w-5" />
                                الخطوة 2: تحديد الأقسام للاستيراد
                            </CardTitle>
                            <CardDescription>
                                اختر الأقسام التي ترغب في استيرادها من الملف.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ImportSectionSelector
                                sections={Object.keys(jsonData)}
                                selected={selectedSections}
                                onChange={setSelectedSections}
                            />
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <List className="h-5 w-5" />
                                الخطوة 3: معاينة البيانات
                            </CardTitle>
                             <CardDescription>
                                هذه معاينة للبيانات التي سيتم استيرادها بناءً على الأقسام التي حددتها.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImportDataPreview data={previewData || {}} />
                        </CardContent>
                        <CardFooter>
                            <SaveImportJson data={jsonData} selectedSections={selectedSections} />
                        </CardFooter>
                    </Card>
                </>
            )}
        </div>
    );
}
