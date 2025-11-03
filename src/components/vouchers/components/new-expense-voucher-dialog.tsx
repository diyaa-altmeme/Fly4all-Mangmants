
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Currency, Box } from '@/lib/types';
import NewExpenseVoucherForm from '@/app/accounts/vouchers/components/new-expense-voucher-form';
import { cn } from '@/lib/utils';
import { Settings2, Loader2 } from 'lucide-react';
import { useVoucherNav } from '@/context/voucher-nav-context';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';


interface NewExpenseVoucherDialogProps {
  onVoucherAdded: (voucher: any) => void;
  children?: React.ReactNode;
}

export default function NewExpenseVoucherDialog({ onVoucherAdded, children }: NewExpenseVoucherDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: navData, loaded: isDataLoaded, fetchData } = useVoucherNav();
  const [dialogDimensions, setDialogDimensions] = useState({ width: '896px', height: '80vh' });

  useEffect(() => {
    if (open && !isDataLoaded) {
      fetchData();
    }
  }, [open, isDataLoaded, fetchData]);

  const handleSuccess = (newVoucher: any) => {
      onVoucherAdded(newVoucher);
      setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="p-0 flex flex-col"
        style={{ maxWidth: dialogDimensions.width, width: '95vw', height: dialogDimensions.height }}
      >
        <DialogHeader 
          className="p-4 rounded-t-lg flex flex-row justify-between items-center bg-primary text-primary-foreground"
        >
          <div>
            <DialogTitle>إنشاء سند مصاريف جديد</DialogTitle>
          </div>
           <div className="flex items-center gap-2">
               <VoucherDialogSettings
                 dialogKey="expense_voucher"
                 onDimensionsChange={setDialogDimensions}
               >
                 <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                    <Settings2 className="h-5 w-5" />
                 </Button>
               </VoucherDialogSettings>
           </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
             {!isDataLoaded || !navData ? (
                 <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8" /></div>
            ) : (
                <NewExpenseVoucherForm onVoucherAdded={handleSuccess} boxes={navData.boxes || []} />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
