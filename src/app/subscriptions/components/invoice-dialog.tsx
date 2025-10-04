
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Subscription, AppSettings, SubscriptionInstallment } from '@/lib/types';
import InvoiceTemplate from './invoice-template';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2, Printer, FileText as InvoiceIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { getSubscriptionInstallments } from '@/app/subscriptions/actions';

interface InvoiceDialogProps {
  subscription: Subscription;
  installments: SubscriptionInstallment[];
}

export default function InvoiceDialog({ subscription, installments }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const settings = navData?.settings;


  const handlePrint = () => {
    const printContent = document.getElementById(`invoice-print-area-${subscription.id}`);
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printContents = printContent.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // To re-attach event listeners
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><InvoiceIcon className="me-2 h-4 w-4" /> عرض الفاتورة</DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>فاتورة الاشتراك</DialogTitle>
          <DialogDescription>
            معاينة الفاتورة قبل الطباعة أو التصدير.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto bg-muted/40 p-4" id={`invoice-print-area-${subscription.id}`}>
          {!isDataLoaded || !settings ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <InvoiceTemplate subscription={subscription} settings={settings} installments={installments} />
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button onClick={handlePrint} disabled={!isDataLoaded}>
            <Printer className="me-2 h-4 w-4" />
            طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
