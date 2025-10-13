
'use client';
import React, { useState } from 'react';
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '@/lib/firebase';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface FileUploaderProps {
    onUpload: (attachments: any[]) => void;
    children: React.ReactNode;
}

export default function FileUploader({ onUpload, children }: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        toast({ title: 'جاري رفع الملفات...' });
        
        const storage = getStorage();
        const attachments: any[] = [];
        
        try {
            for (const f of Array.from(files)) {
                const path = `chat_attachments/${Date.now()}_${uuidv4()}_${f.name}`;
                const fileRef = sRef(storage, path);
                await uploadBytesResumable(fileRef, f);
                const url = await getDownloadURL(fileRef);
                attachments.push({ name: f.name, path, url, size: f.size, type: f.type });
            }
            onUpload(attachments);
            toast({ title: 'تم رفع الملفات بنجاح' });
        } catch (error: any) {
            toast({ title: 'خطأ في الرفع', description: error.message, variant: 'destructive' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <input 
                type="file" 
                multiple 
                onChange={handleFiles} 
                className="hidden" 
                ref={fileInputRef} 
                disabled={uploading}
            />
            <div onClick={triggerFileInput} className="cursor-pointer">
                {uploading ? <Loader2 className="animate-spin" /> : children}
            </div>
        </>
    );
}
