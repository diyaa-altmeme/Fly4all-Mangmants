
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
import type { Client, Supplier } from '@/lib/types';
import AddChangeForm from './add-change-dialog';
import AddBaggageForm from './add-baggage-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddChangeOrBaggageDialogProps {
  clients: Client[];
  suppliers: Supplier[];
  onSuccess: () => void;
  children: React.ReactNode;
}

export default function AddChangeOrBaggageDialog({ clients, suppliers, onSuccess, children }: AddChangeOrBaggageDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    onSuccess();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة سجل جديد</DialogTitle>
          <DialogDescription>اختر نوع السجل الذي تريد إضافته وأدخل التفاصيل.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="change" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="change">إضافة تغيير</TabsTrigger>
            <TabsTrigger value="baggage">إضافة وزن</TabsTrigger>
          </TabsList>
          <TabsContent value="change">
            <AddChangeForm clients={clients} suppliers={suppliers} onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="baggage">
            <AddBaggageForm clients={clients} suppliers={suppliers} onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
