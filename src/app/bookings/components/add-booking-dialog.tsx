
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BookingEntry, Currency } from '@/lib/types';
import { Loader2, Settings2, RotateCcw, X } from 'lucide-react';
import NewBookingForm from './new-booking-form';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { updateUser } from '@/app/users/actions';
import { NumericInput } from '@/components/ui/numeric-input';
import { parseISO } from 'date-fns';

interface BookingDialogProps {
  onBookingAdded?: (newBooking: BookingEntry) => void;
  onBookingUpdated?: (updatedBooking: BookingEntry) => void;
  isEditing?: boolean;
  booking?: BookingEntry;
  children: React.ReactNode;
}

export default function BookingDialog({ 
  onBookingAdded, 
  onBookingUpdated,
  isEditing = false,
  booking,
  children 
}: BookingDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: navData, loaded: isDataLoaded } = useVoucherNav();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);

  const defaultDims = { width: '1400px', height: '90vh' };
  const [dialogDimensions, setDialogDimensions] = useState(defaultDims);
  
  const [currency, setCurrency] = useState<Currency>('USD');
  const headerColor = currency === 'USD' ? 'hsl(var(--accent))' : 'hsl(var(--primary))';


  useEffect(() => {
    if (user && 'role' in user && user.preferences?.dialogSettings?.bookingDialog) {
        const { step1, step2 } = user.preferences.dialogSettings.bookingDialog;
        setDialogDimensions(step2 || defaultDims);
    }
  }, [user]);

  const handleDimensionsSave = async () => {
    if (!user || !('role' in user)) return;
    const newDialogSettings = {
        ...user.preferences?.dialogSettings,
        bookingDialog: { step1: dialogDimensions, step2: dialogDimensions } // Save same dims for both now
    };
    const result = await updateUser(user.uid, { preferences: { ...user.preferences, dialogSettings: newDialogSettings } });
    
    if (result.success) {
      toast({ title: 'تم حفظ أبعاد النافذة' });
      setIsSettingsPopoverOpen(false);
    } else {
      toast({ title: 'خطأ', description: 'لم يتم حفظ الإعدادات', variant: 'destructive' });
    }
  };

  const handleDimensionsReset = () => {
     setDialogDimensions(defaultDims);
     toast({ title: 'تمت إعادة تعيين الأبعاد (سيتم الحفظ مع الإعدادات الأخرى)' });
  }

  const handleSuccess = (data: BookingEntry) => {
    if(isEditing && onBookingUpdated) {
        onBookingUpdated(data);
    } else if (!isEditing && onBookingAdded) {
        onBookingAdded(data);
    }
    setOpen(false);
  }
  
  const getNumericValue = (value: string) => parseInt(value.replace(/px|vw|vh/g, ''), 10) || 0;

  const initialDataForForm = isEditing && booking ? {
    ...booking,
    travelDate: booking.travelDate ? parseISO(booking.travelDate) : new Date(),
    issueDate: booking.issueDate ? parseISO(booking.issueDate) : new Date(),
    passengers: booking.passengers.map(p => ({
      ...p,
      ticketType: p.ticketType || 'Issue',
    }))
  } : undefined;


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="p-0 flex flex-col"
        style={{ 
          maxWidth: dialogDimensions.width, 
          width: '95vw',
          height: dialogDimensions.height,
          maxHeight: '95vh',
          resize: 'both',
          overflow: 'hidden'
        }}
      >
        <DialogHeader 
            className="p-3 rounded-t-lg flex flex-row items-center justify-between sticky top-0 z-10 border-b"
            style={{ backgroundColor: headerColor, color: 'white' }}
        >
           <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 h-7 w-7 rounded-full">
                <X className="h-4 w-4"/>
              </Button>
           </DialogClose>
          <div className="text-right">
            <DialogTitle className="text-white">{isEditing ? `تعديل الحجز (PNR: ${booking?.pnr})` : 'إضافة حجز جديد (PNR)'}</DialogTitle>
          </div>
           <div className="flex items-center gap-2">
                <Button type="button" onClick={() => setCurrency('USD')} className={cn('text-white h-8', currency === 'USD' ? 'bg-white/30' : 'bg-transparent border border-white/50')}>USD</Button>
                <Button type="button" onClick={() => setCurrency('IQD')} className={cn('text-white h-8', currency === 'IQD' ? 'bg-white/30' : 'bg-transparent border border-white/50')}>IQD</Button>
                <Popover open={isSettingsPopoverOpen} onOpenChange={setIsSettingsPopoverOpen}>
                <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                    <Settings2 className="h-5 w-5" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="end">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium leading-none">أبعاد النافذة</h4>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
                                        <RotateCcw className="me-1 h-3 w-3"/> إعادة للوضع الافتراضي
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                            <AlertDialogDescription>سيتم إعادة أبعاد النافذة إلى الحجم الافتراضي.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDimensionsReset} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالإعادة</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                تحكم في حجم النافذة لتناسب شاشتك.
                            </p>
                        </div>
                        <div className="grid gap-4 p-2 border rounded-lg">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="width1">العرض (px)</Label>
                                    <NumericInput id="width1" value={getNumericValue(dialogDimensions.width)} onValueChange={(v) => setDialogDimensions(d => ({...d, width: `${v || 0}px`}))} className="col-span-2 h-8" />
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="height1">الارتفاع (vh)</Label>
                                     <NumericInput id="height1" value={getNumericValue(dialogDimensions.height)} onValueChange={(v) => setDialogDimensions(d => ({...d, height: `${v || 0}vh`}))} className="col-span-2 h-8" />
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleDimensionsSave} size="sm" className="mt-2 w-full">حفظ الأبعاد</Button>
                    </div>
                </PopoverContent>
            </Popover>
           </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
             {!isDataLoaded || !navData ? (
                 <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8" /></div>
            ) : (
                 <NewBookingForm
                    isEditing={isEditing}
                    initialData={initialDataForForm}
                    onBookingAdded={handleSuccess}
                    onBookingUpdated={handleSuccess}
                 />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
