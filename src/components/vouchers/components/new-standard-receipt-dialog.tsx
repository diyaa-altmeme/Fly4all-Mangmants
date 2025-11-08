"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Currency } from '@/lib/types';
import NewStandardReceiptForm from '@/app/accounts/vouchers/components/new-standard-receipt-form';
import { cn } from '@/lib/utils';
import { Settings2, Loader2 } from 'lucide-react';
import { useVoucherNav } from '@/context/voucher-nav-context';
import VoucherDialogSettings from './voucher-dialog-settings';

interface NewStandardReceiptDialogProps {
  onVoucherAdded: (voucher: any) => void;
  children?: React.ReactNode;
}

export default function NewStandardReceiptDialog({ onVoucherAdded, children }: NewStandardReceiptDialogProps) {
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
            <DialogTitle>إنشاء سند قبض عادي</DialogTitle>
          </div>
           <div className="flex items-center gap-2">
               <VoucherDialogSettings
                 dialogKey="standard_receipt"
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
                <NewStandardReceiptForm 
                    onVoucherAdded={handleSuccess} 
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}