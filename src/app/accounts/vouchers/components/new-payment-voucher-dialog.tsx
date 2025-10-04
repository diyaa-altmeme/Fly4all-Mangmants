
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
import type { Currency, Box, Client, Supplier } from '@/lib/types';
import NewPaymentVoucherForm from './new-payment-voucher-form';
import { cn } from '@/lib/utils';
import { Settings2, Loader2 } from 'lucide-react';
import { useVoucherNav } from '@/context/voucher-nav-context';
import VoucherDialogSettings from '@/components/vouchers/components/voucher-dialog-settings';


interface NewPaymentVoucherDialogProps {
  onVoucherAdded: (voucher: any) => void;
  children?: React.ReactNode;
}

export default function NewPaymentVoucherDialog({ onVoucherAdded, children }: NewPaymentVoucherDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const [dialogDimensions, setDialogDimensions] = useState({ width: '896px', height: '80vh' });

  const defaultCurrency = navData?.settings.currencySettings?.defaultCurrency || 'IQD';
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

   useEffect(() => {
    if(navData?.settings.currencySettings?.defaultCurrency) {
        setCurrency(navData.settings.currencySettings.defaultCurrency);
    }
  }, [navData]);

  const handleSuccess = (newVoucher: any) => {
      onVoucherAdded(newVoucher);
      setOpen(false);
  }

  const headerColor = currency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';


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
          className="p-4 rounded-t-lg flex flex-row justify-between items-center"
          style={{ backgroundColor: headerColor, color: 'white' }}
        >
          <div>
            <DialogTitle className="text-white">إنشاء سند دفع جديد</DialogTitle>
          </div>
           <div className="flex items-center gap-2">
               {(navData?.settings?.currencySettings?.currencies || []).map(c => (
                <Button key={c.code} type="button" onClick={() => setCurrency(c.code)} className={cn('text-white h-8', currency === c.code ? 'bg-white/30' : 'bg-transparent border border-white/50')}>
                    {c.code}
                </Button>
              ))}
               <VoucherDialogSettings
                 dialogKey="payment_voucher"
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
             <NewPaymentVoucherForm 
                onVoucherAdded={handleSuccess} 
                selectedCurrency={currency} 
            />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
