
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
import { Pencil } from 'lucide-react';
import NewVisaForm from './new-visa-form';
import { parseISO } from 'date-fns';

interface EditVisaDialogProps {
  booking: VisaBookingEntry;
  onBookingUpdated: (updatedBooking: VisaBookingEntry) => void;
}

export default function EditVisaDialog({ booking, onBookingUpdated }: EditVisaDialogProps) {
  const [open, setOpen] = useState(false);

  const initialDataForForm = {
      ...booking,
      submissionDate: booking.submissionDate ? parseISO(booking.submissionDate) : new Date(),
  };
  
  const handleSuccess = (updatedBooking: VisaBookingEntry) => {
    onBookingUpdated(updatedBooking);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-blue-600 h-8 w-8"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0">
        <DialogHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg">
          <DialogTitle>تعديل طلب الفيزا (الفاتورة: {booking.invoiceNumber})</DialogTitle>
          <DialogDescription className="text-primary-foreground/80">
            قم بتحديث تفاصيل الطلب هنا.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-6">
             <NewVisaForm 
                isEditing={true}
                initialData={initialDataForForm}
                onBookingUpdated={handleSuccess}
             />
        </div>
      </DialogContent>
    </Dialog>
  );
}
