
"use client";

import * as XLSX from "xlsx";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, File, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ImportUpload({ onDataReady }: { onDataReady: (data: any[]) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();

    const handleFile = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                onDataReady(json);
                 toast({ title: `تم تحميل ${json.length} سجل بنجاح`, description: "انتقِل للخطوة التالية لربط الحقول." });
            } catch (error) {
                toast({
                    title: "خطأ في قراءة الملف",
                    description: "تعذر تحليل ملف Excel. الرجاء التأكد من أنه بالتنسيق الصحيح.",
                    variant: "destructive"
                });
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    }, [onDataReady, toast]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            handleFile(acceptedFiles[0]);
        }
    }, [handleFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
    });
    
    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        onDataReady([]);
    }

    return (
        <div 
            {...getRootProps()} 
            className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors relative flex flex-col justify-center items-center h-64",
                isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50",
                file ? "border-green-500 bg-green-50" : ""
            )}
        >
            <input {...getInputProps()} />
            {file ? (
                <>
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive z-10" onClick={removeFile}>
                    <X className="h-5 w-5"/>
                 </Button>
                <div className="flex flex-col items-center justify-center h-full text-green-600">
                    <CheckCircle className="h-12 w-12" />
                    <p className="mt-2 font-semibold text-lg">{file.name}</p>
                    <p className="text-sm">ملف جاهز للمعالجة.</p>
                </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-semibold text-lg">اسحب وأفلت الملف هنا، أو انقر للتصفح</h3>
                    <p className="mt-2 text-sm text-muted-foreground">الملفات المدعومة: XLSX, XLS</p>
                </div>
            )}
        </div>
    );
}
