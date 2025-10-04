
"use client";

import React, { useState, useEffect } from 'react';
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
import type { Box } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addBox, updateBox } from '../actions';
import { useRouter } from 'next/navigation';
import { NumericInput } from '@/components/ui/numeric-input';

const formSchema = z.object({
  name: z.string().min(2, "اسم الصندوق مطلوب (حرفين على الأقل)."),
  openingBalanceUSD: z.coerce.number().min(0, "الرصيد يجب أن يكون رقمًا موجبًا.").default(0),
  openingBalanceIQD: z.coerce.number().min(0, "الرصيد يجب أن يكون رقمًا موجبًا.").default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditBoxDialogProps {
  isEditing?: boolean;
  box?: Box;
  children: React.ReactNode;
}

export default function AddEditBoxDialog({ isEditing = false, box, children }: AddEditBoxDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && box ? box : {
        name: '',
        openingBalanceUSD: 0,
        openingBalanceIQD: 0,
    }
  });

  useEffect(() => {
    if (open) {
      form.reset(isEditing && box ? box : { name: '', openingBalanceUSD: 0, openingBalanceIQD: 0 });
    }
  }, [open, form, isEditing, box]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    try {
      let result;
      if (isEditing && box) {
        result = await updateBox(box.id, data);
      } else {
        result = await addBox(data);
      }

      if (result.success) {
        toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} الصندوق بنجاح` });
        router.refresh();
        setOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل صندوق' : 'إضافة صندوق جديد'}</DialogTitle>
                     <DialogDescription>
                        أدخل اسم الصندوق وأرصدته الافتتاحية.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>اسم الصندوق</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="openingBalanceUSD" render={({ field }) => ( <FormItem><FormLabel>الرصيد الافتتاحي (USD)</FormLabel><FormControl><NumericInput {...field} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="openingBalanceIQD" render={({ field }) => ( <FormItem><FormLabel>الرصيد الافتتاحي (IQD)</FormLabel><FormControl><NumericInput {...field} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        {isEditing ? 'حفظ التعديلات' : 'إضافة الصندوق'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
