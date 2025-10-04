
"use client";

import React, { useState, useCallback } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirebaseConfig } from '@/lib/firebase-client-config';
import { updateClient } from '@/app/clients/actions';
import type { Client } from '@/lib/types';
import Image from 'next/image';

interface ChangeAvatarDialogProps {
  client: Client;
  onAvatarChanged: () => void;
  children: React.ReactNode;
}

export default function ChangeAvatarDialog({ client, onAvatarChanged, children }: ChangeAvatarDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.gif'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) {
      toast({ description: "الرجاء اختيار صورة أولاً", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const firebaseConfig = getFirebaseConfig();
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig!);
      const storage = getStorage(app);
      const storageRef = ref(storage, `avatars/${client.id}/${file.name}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const result = await updateClient(client.id, { avatarUrl: downloadURL });

      if (result.success) {
        toast({ title: "تم تحديث الصورة الشخصية بنجاح" });
        onAvatarChanged();
        setOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "خطأ في رفع الصورة", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>تغيير الصورة الشخصية</DialogTitle>
            <DialogDescription>
                اختر صورة جديدة ليتم عرضها في ملفك الشخصي.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragActive ? 'border-primary' : ''}`}
            >
                <input {...getInputProps()} />
                {preview ? (
                    <Image src={preview} alt="Preview" width={100} height={100} className="rounded-full mx-auto" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <UploadCloud className="h-10 w-10" />
                        <p>اسحب وأفلت الصورة هنا أو انقر للاختيار</p>
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
             <Button onClick={handleUpload} disabled={isUploading || !file}>
                {isUploading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ الصورة الجديدة
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
