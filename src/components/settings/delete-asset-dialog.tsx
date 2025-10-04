
"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SiteAsset } from '@/lib/types';
import { permanentDeleteAsset } from '@/app/settings/assets/actions';


interface DeleteAssetDialogProps {
  asset: SiteAsset;
  onAssetDeleted: () => void;
  children: React.ReactNode;
}

export default function DeleteAssetDialog({ asset, onAssetDeleted, children }: DeleteAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        const result = await permanentDeleteAsset(asset);
        if (!result.success) {
            throw new Error(result.error);
        }
        toast({ title: "تم حذف الأصل بنجاح" });
        onAssetDeleted();
        setOpen(false);
    } catch (error: any) {
        toast({
            title: "خطأ في الحذف",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيؤدي هذا إلى حذف الأصل <span className="font-bold">{asset.name}</span> بشكل دائم من قاعدة البيانات والتخزين. هذا الإجراء لا يمكن التراجع عنه.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className={cn(buttonVariants({ variant: 'destructive' }))}>
            {isDeleting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            نعم، قم بالحذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
