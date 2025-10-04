
"use client";

import React, { useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface MessageComposerProps {
    message: string;
    onMessageChange: (message: string) => void;
    attachment: File | null;
    onAttachmentChange: (file: File | null) => void;
    footerActions?: React.ReactNode;
}

export default function MessageComposer({
    message,
    onMessageChange,
    attachment,
    onAttachmentChange,
    footerActions
}: MessageComposerProps) {

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if(acceptedFiles.length > 0) {
            onAttachmentChange(acceptedFiles[0]);
        }
    }, [onAttachmentChange]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: { 
            'image/*': ['.jpeg', '.png', '.jpg', '.gif'], 
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
    });
    
    const attachmentPreview = attachment ? URL.createObjectURL(attachment) : null;

    return (
        <Card className="sticky top-24">
            <CardContent className="space-y-4 pt-6">
                 <div className="space-y-2">
                    <Label htmlFor="message">نص الرسالة</Label>
                    <Textarea id="message" rows={12} placeholder="استخدم *للنص العريض* و _للنص المائل_." value={message} onChange={(e) => onMessageChange(e.target.value)} />
                </div>
                
                 <div className="space-y-2">
                    <Label>المرفق (صورة أو PDF)</Label>
                    {attachment ? (
                        <div className="relative p-2 border rounded-lg w-fit">
                            {attachment.type.startsWith('image/') ? (
                                <Image src={attachmentPreview!} alt="Preview" width={100} height={100} className="rounded-md object-cover"/>
                            ) : (
                                <div className="flex items-center gap-2 p-4">
                                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                                    <span className="text-sm">{attachment.name}</span>
                                </div>
                            )}
                             <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => onAttachmentChange(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                         <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer flex flex-col justify-center items-center hover:border-primary transition-colors">
                            <input {...getInputProps()} />
                            <Upload className="h-8 w-8 text-muted-foreground"/>
                            <p className="mt-2 text-sm text-muted-foreground">اسحب وأفلت الملف هنا أو انقر للاختيار (صورة، PDF، ...)</p>
                        </div>
                    )}
                </div>
            </CardContent>
            {footerActions && (
                 <CardFooter>
                    {footerActions}
                </CardFooter>
            )}
        </Card>
    );
}
