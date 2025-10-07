
"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
// import * as XLSX from 'xlsx';
import { UploadCloud, File, X, CheckCircle, AlertTriangle } from 'lucide-react';
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
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
             toast({
                title: "وظيفة معطلة",
                description: "تم تعطيل تحميل ملفات Excel مؤقتًا بسبب ثغرة أمنية.",
                variant: "destructive"
            });
        }
    }, [toast]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        disabled: true // Disable dropzone
    });

    return (
        <div 
            {...getRootProps()} 
            className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-not-allowed bg-muted/20 relative flex flex-col justify-center items-center h-full min-h-[160px]",
                borderColorClass
            )}
        >
            <input {...getInputProps()} id={fileId} />
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <h3 className="mt-2 font-semibold text-sm">{title} (معطل)</h3>
                <p className="mt-1 text-xs">هذه الميزة غير متاحة حاليا.</p>
            </div>
        </div>
    );
}
