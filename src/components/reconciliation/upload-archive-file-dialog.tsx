
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Upload, PlusCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, updateMetadata } from "firebase/storage";
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirebaseConfig } from '@/lib/firebase-client-config';


interface UploadArchiveFileDialogProps {
  onUploadSuccess: () => void;
  children: React.ReactNode;
}

export default function UploadArchiveFileDialog({ onUploadSuccess, children }: UploadArchiveFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  
  const resetForm = () => {
      setFile(null);
      setDisplayName('');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !displayName) {
        toast({ description: "الرجاء تعبئة جميع الحقول", variant: 'destructive' });
        return;
    }

    setIsSaving(true);
    
    try {
        const firebaseConfig = getFirebaseConfig();
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const storage = getStorage(app);
        const storageRef = ref(storage, `reconciliation_files/${Date.now()}_${file.name}`);

        await uploadBytes(storageRef, file);

        await updateMetadata(storageRef, {
            customMetadata: {
                displayName: displayName
            }
        });

        toast({ title: "تم رفع الملف بنجاح" });
        onUploadSuccess();
        resetForm();
        setOpen(false);
    } catch (error: any) {
        let message = error.message;
        if (error.code === 'storage/unauthorized') {
            message = "فشل الرفع. تحقق من قواعد أمان التخزين للسماح بالكتابة.";
        }
        toast({ title: "فشل الرفع", description: message, variant: 'destructive' });
        console.error("Upload failed:", error);
    }
    
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>رفع ملف جديد للأرشيف</DialogTitle>
                <DialogDescription>
                    اختر الملف وادخل وصفًا له. سيتم حفظه في الدلو الافتراضي للمشروع.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="display-name">اسم الملف / الوصف</Label>
                    <Input 
                        id="display-name" 
                        placeholder="مثال: كشف حساب شهر يناير" 
                        required 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="file-upload-input">اختر الملف</Label>
                    <Input 
                        id="file-upload-input" 
                        type="file" 
                        required 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </div>
            </div>
            <DialogFooter>
                 <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    رفع وحفظ
                 </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
