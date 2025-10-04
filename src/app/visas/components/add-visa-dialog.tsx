

"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Box, Client, Supplier, VisaBookingEntry } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import NewVisaForm from './new-visa-form';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2 } from 'lucide-react';

interface AddVisaDialogProps {
  onBookingAdded: (newBooking: VisaBookingEntry) => void;
}

export default function AddVisaDialog({ onBookingAdded }: AddVisaDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();

  const handleSuccess = (newBooking: VisaBookingEntry) => {
      onBookingAdded(newBooking);
      setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="me-2 h-4 w-4" /> إضافة طلب فيزا</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
          <DialogTitle>إضافة طلب فيزا جديد</DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            أدخل جميع تفاصيل طلب الفيزا هنا.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-6">
             {isDataLoaded ? (
                <NewVisaForm 
                    onBookingAdded={handleSuccess}
                 />
             ) : (
                <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8" /></div>
             )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
