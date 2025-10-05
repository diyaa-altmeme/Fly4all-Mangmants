
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Currency, Client, Supplier, User, Box, AppSettings } from '@/lib/types';
import NewDistributedReceiptForm from './new-distributed-receipt-form';
import type { DistributedVoucherSettings } from '@/app/accounts/vouchers/settings/components/distributed-settings-form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings2, ArrowRight, Terminal, User as UserIcon, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import DistributedSettingsForm from '@/app/accounts/vouchers/settings/components/distributed-settings-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AddClientDialog from '@/app/clients/components/add-client-dialog';
import { useVoucherNav } from '@/context/voucher-nav-context';


interface NewDistributedReceiptDialogProps {
    onVoucherAdded: (voucher: any) => void;
    children?: React.ReactNode;
}

export default function NewDistributedReceiptDialog({ 
    onVoucherAdded, 
    children,
}: NewDistributedReceiptDialogProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();
  const { data: navData, loaded: isDataLoaded, fetchData } = useVoucherNav();
  
  const voucherSettings = navData?.settings.voucherSettings?.distributed;
  const [dialogDimensions, setDialogDimensions] = useState<{ width?: string, height?: string }>({
    width: voucherSettings?.dialogWidth || '1200px',
    height: voucherSettings?.dialogHeight || '700px',
  });
  
  const defaultCurrency = navData?.settings.currencySettings?.defaultCurrency || 'IQD';
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  useEffect(() => {
    if(navData?.settings.currencySettings?.defaultCurrency) {
        setCurrency(navData.settings.currencySettings.defaultCurrency);
    }
  }, [navData]);

  useEffect(() => {
    if(voucherSettings) {
        setDialogDimensions({
            width: voucherSettings.dialogWidth || '1200px',
            height: voucherSettings.dialogHeight || '700px'
        });
    }
  }, [voucherSettings]);

  const handleSuccess = (newVoucher: any) => {
      onVoucherAdded(newVoucher);
      setOpen(false);
  }

  const handleSettingsSaved = async () => {
    toast({ title: 'تم حفظ الإعدادات', description: 'سيتم تطبيق الإعدادات الجديدة في المرة القادمة التي تفتح فيها هذا النموذج.' });
    await fetchData(); // Refetch settings
    setShowSettings(false);
  };
  
  const headerColor = currency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
       <DialogContent 
        className="p-0 flex flex-col overflow-auto"
        style={{
            maxWidth: dialogDimensions.width, 
            width: '95vw',
            height: dialogDimensions.height,
            resize: 'both',
        }}
      >
        <DialogHeader 
           className="p-4 rounded-t-lg flex flex-row justify-between items-center sticky top-0 bg-background z-10 border-b"
           style={{ backgroundColor: headerColor, color: 'white' }}
        >
            <div>
                <DialogTitle className="text-white">{showSettings ? 'إعدادات سند القبض المخصص' : 'سند قبض مخصص'}</DialogTitle>
            </div>
             <div className="flex items-center gap-2">
              {!showSettings && (
                  <>
                     {(navData?.settings?.currencySettings?.currencies || []).map(c => (
                        <Button key={c.code} type="button" onClick={() => setCurrency(c.code as Currency)} className={cn('text-white h-8', currency === c.code ? 'bg-white/30' : 'bg-transparent border border-white/50')}>
                            {c.code}
                        </Button>
                      ))}
                    {isDataLoaded && navData && (
                        <AddClientDialog 
                            onClientAdded={() => {}} 
                            onClientUpdated={() => {}} 
                        >
                             <Button variant="outline" size="sm" className="h-8 text-black"><Building className="me-2 h-4 w-4"/> إضافة شركة</Button>
                        </AddClientDialog>
                    )}
                  </>
              )}
              <Button onClick={() => setShowSettings(!showSettings)} variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                 {showSettings ? <ArrowRight className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
              </Button>
            </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
            {!isDataLoaded || !navData ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
            ) : showSettings ? (
                 <div className="p-6">
                    <DistributedSettingsForm 
                        initialSettings={voucherSettings}
                        onSaveSuccess={handleSettingsSaved}
                        onDimensionsChange={setDialogDimensions}
                    />
                 </div>
            ) : !voucherSettings?.distributionChannels?.length ? (
                 <div className="p-8 text-center">
                     <Alert variant="destructive">
                         <Terminal className="h-4 w-4" />
                         <AlertTitle>إعدادات غير مكتملة!</AlertTitle>
                         <AlertDescription>
                            الرجاء الضغط على أيقونة الإعدادات <Settings2 className="inline-block h-4 w-4 mx-1"/> في الأعلى وتحديد حقول التوزيع أولاً.
                         </AlertDescription>
                     </Alert>
                </div>
            ) : (
                <NewDistributedReceiptForm 
                    onVoucherAdded={handleSuccess} 
                    settings={voucherSettings}
                    selectedCurrency={currency}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
