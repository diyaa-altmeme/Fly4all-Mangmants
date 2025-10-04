

"use client";

import React, { useState, useMemo } from 'react';
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
import { PlusCircle, Save, Loader2 } from 'lucide-react';
import AddTransactionsForm from './add-transactions-form';
import type { UnifiedLedgerEntry, Exchange } from '@/lib/types';
import { useThemeCustomization } from '@/context/theme-customization-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddTransactionsDialogProps {
  exchangeId: string;
  exchanges: Exchange[];
  onSuccess: (newBatch: UnifiedLedgerEntry) => void;
  isEditing?: boolean;
  initialData?: UnifiedLedgerEntry;
  children?: React.ReactNode;
}

export default function AddTransactionsDialog({ exchangeId, exchanges, onSuccess, isEditing = false, initialData, children }: AddTransactionsDialogProps) {
  const [open, setOpen] = useState(false);
  const { themeSettings } = useThemeCustomization();
  const { toast } = useToast();
  const formRef = React.useRef<{ handleSave: () => Promise<UnifiedLedgerEntry | null>; isSaving: boolean; summary: Record<string, number> }>(null);
  
  const [stagedEntriesCount, setStagedEntriesCount] = useState(0);
  const [summary, setSummary] = useState<Record<string, number>>({});


  const handleSuccess = (newBatch: UnifiedLedgerEntry) => {
    onSuccess(newBatch);
    setOpen(false);
  };
  
  const headerColor = themeSettings?.light?.primary ? `hsl(${themeSettings.light.primary})` : 'hsl(var(--primary))';
  
  const triggerSave = async () => {
      if (formRef.current) {
        setOpen(false);
        toast({ title: `جاري ${isEditing ? 'تحديث' : 'حفظ'} المعاملات...` });
        const result = await formRef.current.handleSave();
        if (result) {
            onSuccess(result);
        }
      }
  }
  
  const isSaving = formRef.current?.isSaving || false;


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button><PlusCircle className="me-2 h-4 w-4" />إضافة معاملة</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader 
          className="p-4 rounded-t-lg"
          style={{ backgroundColor: headerColor, color: 'white' }}
        >
          <DialogTitle className="text-white">{isEditing ? `تعديل دفعة المعاملات: ${initialData?.invoiceNumber}` : 'إدخال معاملات جديدة للبورصة'}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-2 sm:px-6 py-2">
            <AddTransactionsForm 
              ref={formRef}
              exchangeId={exchangeId}
              exchanges={exchanges}
              onSuccess={handleSuccess} 
              isEditing={isEditing}
              initialData={initialData?.details || []}
              batchId={initialData?.id}
              onStagedEntriesChange={setStagedEntriesCount}
              onSummaryChange={setSummary}
            />
        </div>
         <DialogFooter className="p-2 sm:p-4 border-t flex-col sm:flex-row justify-between items-center bg-background">
            <div className="flex-grow w-full">
                 {stagedEntriesCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">الملخص:</h4>
                         {Object.entries(summary).filter(([key]) => key !== 'totalUSD').map(([currency, total]) => (
                            <div key={currency} className="p-2 bg-muted rounded-md text-center">
                                <p className="text-xs text-muted-foreground">مجموع {currency}</p>
                                <p className="font-mono font-bold text-xs">{Number(total).toLocaleString()}</p>
                            </div>
                        ))}
                         <div className="p-2 bg-primary/10 rounded-md text-center border border-primary/50">
                            <p className="text-xs text-primary font-bold">الإجمالي المعادل</p>
                            <p className="font-mono font-bold text-primary text-sm">{(summary.totalUSD || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</p>
                        </div>
                    </div>
                )}
            </div>
            <Button onClick={triggerSave} disabled={isSaving || stagedEntriesCount === 0} className="w-full sm:w-auto" size="lg">
                {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                <Save className="me-2 h-4 w-4" />
                {isEditing ? 'حفظ كل التعديلات' : `حفظ (${stagedEntriesCount}) معاملات`}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
