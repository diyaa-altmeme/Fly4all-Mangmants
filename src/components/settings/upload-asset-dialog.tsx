
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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirebaseConfig } from '@/lib/firebase-client-config';
import { getCurrentUserFromSession } from '@/app/auth/actions';
import { addSiteAsset } from '@/app/settings/assets/actions';


interface UploadAssetDialogProps {
  onUploadSuccess: () => void;
  children: React.ReactNode;
}

export default function UploadAssetDialog({ onUploadSuccess, children }: UploadAssetDialogProps) {
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
        const user = await getCurrentUserFromSession();
        const firebaseConfig = getFirebaseConfig();
        const app = getApps().length === 0 ? initializeApp(firebaseConfig!) : getApp();
        const storage = getStorage(app);
        
        const fileId = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `site_assets/${fileId}`);

        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        const result = await addSiteAsset({
            id: fileId,
            name: displayName,
            url: downloadURL,
            fullPath: storageRef.fullPath,
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.name || 'N/A',
            assignment: null,
        });

        if (!result.success) {
            throw new Error(result.error);
        }

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
                <DialogTitle>إضافة أصل جديد</DialogTitle>
                <DialogDescription>
                    ارفع صورة من جهازك. سيتم حفظها في مجلد `site_assets` في دلو التخزين.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="display-name">اسم العرض</Label>
                    <Input 
                        id="display-name" 
                        placeholder="مثال: شعار الشريط الجانبي" 
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
