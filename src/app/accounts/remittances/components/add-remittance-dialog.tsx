
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
import type { Remittance, RemittanceSettings } from '@/lib/types';
import NewRemittanceForm from './new-remittance-form';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2 } from 'lucide-react';
import { parseISO } from 'date-fns';

interface AddRemittanceDialogProps {
  onSaveSuccess: (remittance: Remittance) => void;
  children: React.ReactNode;
  isEditing?: boolean;
  initialData?: Remittance;
}

export default function AddRemittanceDialog({ onSaveSuccess, children, isEditing = false, initialData }: AddRemittanceDialogProps) {
  const [open, setOpen] = useState(false);
  const { data, loaded, fetchData } = useVoucherNav();
  const remittanceSettings = data?.settings?.remittanceSettings;

  useEffect(() => {
    if (open && !loaded) {
      fetchData();
    }
  }, [open, loaded, fetchData]);

  const handleSuccess = (remittance: Remittance) => {
    onSaveSuccess(remittance);
    setOpen(false);
  }

  const processedInitialData = useMemo(() => {
    if (!initialData) return undefined;
    return {
      ...initialData,
      createdAt: initialData.createdAt ? parseISO(initialData.createdAt) : new Date(),
      updatedAt: initialData.updatedAt ? parseISO(initialData.updatedAt) : new Date(),
      auditedAt: initialData.auditedAt ? parseISO(initialData.auditedAt) : undefined,
      receivedAt: initialData.receivedAt ? parseISO(initialData.receivedAt) : undefined,
    };
  }, [initialData]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
          <DialogTitle>{isEditing ? 'تعديل بيانات الحوالة' : 'إضافة حوالة جديدة'}</DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            {isEditing ? 'قم بتحديث تفاصيل الحوالة.' : 'أدخل جميع تفاصيل الحوالة هنا. سيتم حفظها وانتظار التدقيق.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-6">
          {!loaded || !remittanceSettings ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
             <NewRemittanceForm
                settings={remittanceSettings}
                onSaveSuccess={handleSuccess}
                isEditing={isEditing}
                initialData={processedInitialData}
             />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
