
"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface FileUploaderProps {
    title: string;
    description: string;
    onFileUpload: (data: any[]) => void;
    fileId: string;
    borderColorClass?: string;
}

export default function FileUploader({ title, description, onFileUpload, fileId, borderColorClass }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            setFile(selectedFile);
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    onFileUpload(json);
                } catch (error) {
                    toast({
                        title: "خطأ في قراءة الملف",
                        description: "تعذر تحليل ملف Excel. الرجاء التأكد من أنه بالتنسيق الصحيح.",
                        variant: "destructive"
                    });
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    }, [onFileUpload, toast]);

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
        onFileUpload([]); // Clear data
    }

    return (
        <div 
            {...getRootProps()} 
            className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-300 relative flex flex-col justify-center items-center h-full min-h-[160px] hover:shadow-lg hover:scale-105",
                isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50",
                file ? "bg-green-50" : "",
                borderColorClass
            )}
        >
            <input {...getInputProps()} id={fileId} />
            {file ? (
                <>
                 <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive z-10" onClick={removeFile}>
                    <X className="h-4 w-4"/>
                 </Button>
                <div className="flex flex-col items-center justify-center h-full text-green-600">
                    <CheckCircle className="h-8 w-8" />
                    <p className="mt-1 font-semibold text-sm truncate max-w-full px-4">{file.name}</p>
                </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <h3 className="mt-2 font-semibold text-sm">{title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
            )}
        </div>
    );
}
