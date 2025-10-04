
"use client";

import React from 'react';
import { UnifiedLedgerEntry, Exchange } from '@/lib/types';
import AddTransactionsDialog from './add-transactions-dialog';
import AddPaymentsDialog from './add-payments-dialog';

interface EditBatchDialogProps {
  batch: UnifiedLedgerEntry;
  exchanges: Exchange[];
  onSuccess: (updatedBatch: UnifiedLedgerEntry) => void;
  children: React.ReactNode;
}

export default function EditBatchDialog({ batch, exchanges, onSuccess, children }: EditBatchDialogProps) {
  if (batch.entryType === 'transaction') {
    return (
      <AddTransactionsDialog 
        exchangeId={batch.exchangeId || ''} 
        exchanges={exchanges}
        onSuccess={onSuccess} 
        isEditing 
        initialData={batch}
      >
        {children}
      </AddTransactionsDialog>
    );
  }

  if (batch.entryType === 'payment') {
    return (
      <AddPaymentsDialog 
        exchangeId={batch.exchangeId || ''} 
        exchanges={exchanges}
        onSuccess={onSuccess} 
        isEditing 
        initialData={batch}
      >
        {children}
      </AddPaymentsDialog>
    );
  }

  return <>{children}</>;
}
