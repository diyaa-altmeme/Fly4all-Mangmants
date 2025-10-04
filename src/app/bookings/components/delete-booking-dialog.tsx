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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { deleteBooking as deleteBookingAction } from '@/app/bookings/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DeleteBookingDialogProps {
  bookingId: string;
  onBookingDeleted: (bookingId: string) => void;
  children: React.ReactNode;
}

export default function DeleteBookingDialog({ bookingId, onBookingDeleted, children }: DeleteBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBookingAction(bookingId);
    
    if (result.success) {
      toast({ title: "تم حذف الحجز بنجاح" });
      onBookingDeleted(bookingId);
      setOpen(false);
    } else {
      toast({
        title: "خطأ",
        description: result.error || "حدث خطأ أثناء حذف الحجز.",
        variant: "destructive",
      });
    }
    setIsDeleting(false);
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
            هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف الحجز وجميع المسافرين المرتبطين به بشكل دائم.
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
