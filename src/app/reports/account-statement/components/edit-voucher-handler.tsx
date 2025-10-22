
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Loader2 } from 'lucide-react';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { useRouter } from 'next/navigation';

// Import all possible edit dialogs
import BookingDialog from '@/app/bookings/components/add-booking-dialog';
import EditVisaDialog from '@/app/visas/components/edit-visa-dialog';
import AddSubscriptionDialog from '@/app/subscriptions/components/add-subscription-dialog';
import EditSegmentPeriodDialog from '@/components/segments/edit-segment-period-dialog';
import EditManualProfitDialog from '@/app/profit-sharing/components/edit-manual-profit-dialog';
import { getVoucherById } from '@/app/accounts/vouchers/list/actions';
import { getBookings } from '@/app/bookings/actions'; // Assuming this can fetch a single booking
import { getVisaBookingById } from '@/app/visas/actions';
import { getSubscriptionById } from '@/app/subscriptions/actions';
import { getMonthlyProfits } from '@/app/profit-sharing/actions';

interface EditVoucherHandlerProps {
  voucherId: string;
  sourceType?: string;
  sourceId?: string;
  onVoucherUpdated: () => void;
}

const EditVoucherHandler = ({ voucherId, sourceType, sourceId, onVoucherUpdated }: EditVoucherHandlerProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: navData } = useVoucherNav();


  const handleFetchAndOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    
    let fetchedData = null;

    try {
        switch (sourceType) {
            case 'booking':
                const { bookings } = await getBookings({ all: true }); // A bit inefficient, but works for now
                fetchedData = bookings.find(b => b.id === sourceId);
                break;
            case 'visa':
                fetchedData = await getVisaBookingById(sourceId!);
                break;
            case 'subscription':
                fetchedData = await getSubscriptionById(sourceId!);
                break;
            case 'segment':
            case 'profit-sharing':
                 // These are more complex as they are period-based
                 // The dialogs themselves might need to fetch data
                 fetchedData = { id: sourceId }; 
                break;
            default:
                // For standard vouchers, redirect to the full edit page
                router.push(`/accounts/vouchers/${voucherId}/edit`);
                setIsLoading(false);
                return;
        }
        setData(fetchedData);
        setDialogOpen(true);

    } catch (error) {
        console.error("Failed to fetch data for editing:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const renderDialog = () => {
    if (!dialogOpen || !data) return null;

    const handleSuccess = () => {
        setDialogOpen(false);
        onVoucherUpdated();
    }

    switch (sourceType) {
        case 'booking':
            return (
                <BookingDialog isEditing booking={data} onBookingUpdated={handleSuccess}>
                    <span/>
                </BookingDialog>
            );
        case 'visa':
             return (
                <EditVisaDialog booking={data} onBookingUpdated={handleSuccess}>
                     <span/>
                </EditVisaDialog>
            );
        case 'subscription':
             return (
                <AddSubscriptionDialog isEditing initialData={data} onSubscriptionUpdated={handleSuccess}>
                    <span/>
                </AddSubscriptionDialog>
            );
        case 'segment':
             return (
                <EditSegmentPeriodDialog existingPeriod={data} clients={navData?.clients || []} suppliers={navData?.suppliers || []} onSuccess={handleSuccess}>
                     <span/>
                </EditSegmentPeriodDialog>
            );
         case 'profit-sharing':
             const manualProfitPeriod = navData?.monthlyProfits?.find(p => p.id === sourceId);
             if (!manualProfitPeriod) return null;
             return (
                <EditManualProfitDialog period={manualProfitPeriod} partners={[...(navData?.clients || []), ...(navData?.suppliers || [])]} onSuccess={handleSuccess}>
                    <span/>
                </EditManualProfitDialog>
            );
        default:
            return null;
    }
  }

  return (
    <>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" onClick={handleFetchAndOpen} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
      </Button>
      {renderDialog()}
    </>
  );
};

export default EditVoucherHandler;
