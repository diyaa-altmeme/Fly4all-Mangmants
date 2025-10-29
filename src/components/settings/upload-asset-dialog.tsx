
"use client";

import React, { useState } from 'react';
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
import { Loader2, Save, Upload, File as FileIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addSiteAsset } from '@/app/settings/assets/actions';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { app } from '@/lib/firebase'; // Corrected import

const formSchema = z.object({
  name: z.string().min(3, "اسم الأصل مطلوب."),
  file: z.instanceof(File).refine(file => file.size > 0, "الملف مطلوب."),
});

type FormValues = z.infer<typeof formSchema>;

interface UploadAssetDialogProps {
  onUploadSuccess: () => void;
  children: React.ReactNode;
}

export default function UploadAssetDialog({ onUploadSuccess, children }: UploadAssetDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });
    const { handleSubmit, control, setValue, watch, formState: { isSubmitting } } = form;

    const watchedFile = watch('file');

    const onDrop = React.useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setValue('file', acceptedFiles[0], { shouldValidate: true });
        }
    }, [setValue]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'] },
        multiple: false,
    });
    
    const handleFormSubmit = async (data: FormValues) => {
        if (!user) {
            toast({ title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول لرفع الملفات.', variant: 'destructive'});
            return;
        }

        try {
            const storage = getStorage(app);
            const fileId = uuidv4();
            const filePath = `site-assets/${fileId}-${data.file.name}`;
            const fileStorageRef = storageRef(storage, filePath);
            
            const uploadTask = await uploadBytes(fileStorageRef, data.file);
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            const assetData = {
                id: fileId,
                name: data.name,
                url: downloadUrl,
                fileName: data.file.name,
                fileType: data.file.type,
                size: data.file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: user.uid,
                assignment: null,
                fullPath: filePath,
            };

            const result = await addSiteAsset(assetData);
            if (result.success) {
                toast({ title: "تم رفع الأصل بنجاح" });
                onUploadSuccess();
                setOpen(false);
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "خطأ في الرفع", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>رفع أصل جديد</DialogTitle>
                    <DialogDescription>
                        ارفع صورة أو شعارًا لاستخدامه في أجزاء مختلفة من النظام.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                         <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>اسم الأصل</FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: شعار الفاتورة الرئيسي" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="file"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الملف</FormLabel>
                                     <div
                                        {...getRootProps()}
                                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer"
                                    >
                                        <input {...getInputProps()} id="asset-file-upload" />
                                        {watchedFile ? (
                                            <div className="relative w-40 h-40">
                                                <Image src={URL.createObjectURL(watchedFile)} alt="Preview" layout="fill" objectFit="contain" className="rounded-md" />
                                                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground" onClick={(e) => { e.stopPropagation(); setValue('file', null as any); }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                <p className="text-sm text-gray-600">
                                                    {isDragActive ? 'أفلت الملف هنا...' : 'اسحب وأفلت الملف هنا، أو انقر للاختيار'}
                                                </p>
                                                <p className="text-xs text-gray-500">PNG, JPG, GIF, SVG up to 2MB</p>
                                            </div>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                <Save className="me-2 h-4 w-4" />
                                حفظ ورفع
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
