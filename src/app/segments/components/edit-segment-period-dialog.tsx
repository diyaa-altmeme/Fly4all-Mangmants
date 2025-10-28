
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import AddSegmentPeriodDialog from '../add-segment-period-dialog';
import type { Client, Supplier } from '@/lib/types';


interface EditSegmentPeriodDialogProps {
  existingPeriod: {
    fromDate: string;
    toDate: string;
    entries: any[];
    periodId: string;
  };
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => Promise<void>;
  children?: React.ReactNode;
}

export default function EditSegmentPeriodDialog({ 
    existingPeriod, 
    clients, 
    suppliers, 
    onSuccess,
    children,
}: EditSegmentPeriodDialogProps) {
    
    // We can reuse the AddSegmentPeriodDialog for editing
    // by passing the existing data to it.
    
    return (
        <AddSegmentPeriodDialog
            isEditing={true}
            existingPeriod={existingPeriod}
            clients={clients}
            suppliers={suppliers}
            onSuccess={onSuccess}
        >
            {children}
        </AddSegmentPeriodDialog>
    );
}

