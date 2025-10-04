
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Settings2, ArrowRight, X } from 'lucide-react';
import ClientForm from '@/components/relations/client-form';
import type { CompanyGroup, WorkType, RelationSection, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useVoucherNav } from '@/context/voucher-nav-context';


interface AddClientDialogProps {
  onClientAdded?: (newClient: Client) => void;
  onClientUpdated?: (updatedClient: Client) => void;
  isEditing?: boolean;
  initialData?: Client;
  children: React.ReactNode;
}

export default function AddClientDialog({ 
    onClientAdded, 
    onClientUpdated,
    isEditing,
    initialData,
    children,
}: AddClientDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const [dialogDimensions, setDialogDimensions] = useState({ width: '850px', height: '90vh' });
    const [currentStep, setCurrentStep] = useState(0);
    const { data: navData, loaded: navDataLoaded, fetchData, refreshData } = useVoucherNav();
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    const { relationSections } = React.useMemo(() => ({
        relationSections: navData?.settings?.relationSections || [],
    }), [navData]);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            setCurrentStep(0);
        } else {
            setIsEditingLayout(false);
        }
    };
    
    const handleSuccess = (client: Client) => {
        if (isEditing) {
            if (onClientUpdated) onClientUpdated(client);
        } else {
            if (onClientAdded) onClientAdded(client);
        }
        refreshData();
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent 
                showCloseButton={false}
                className="p-0 max-h-[90vh] flex flex-col"
                style={{ maxWidth: dialogDimensions.width, width: '95vw', height: dialogDimensions.height }}
            >
                <DialogHeader className="bg-primary text-primary-foreground p-3 rounded-t-lg flex flex-row items-center justify-between sticky top-0 z-10 border-b">
                   <div className="flex items-center gap-2">
                         <Button onClick={() => setIsEditingLayout(prev => !prev)} variant={isEditingLayout ? "secondary" : "ghost"} size="icon" className="text-white hover:bg-white/20 h-8 w-8">
                           <Settings2 className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="text-right">
                        <DialogTitle className="text-white">{isEditing ? 'تعديل بيانات العلاقة' : 'إضافة علاقة جديدة'}</DialogTitle>
                    </div>
                     <DialogClose asChild>
                      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 h-7 w-7 rounded-full">
                        <X className="h-4 w-4"/>
                      </Button>
                   </DialogClose>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto">
                     {!navDataLoaded ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                     ) : (
                        <ClientForm
                            isEditing={isEditing}
                            initialData={initialData}
                            relationSections={relationSections}
                            onSuccess={handleSuccess}
                            currentStep={currentStep}
                            setCurrentStep={setCurrentStep}
                            isEditingLayout={isEditingLayout}
                        />
                     )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
