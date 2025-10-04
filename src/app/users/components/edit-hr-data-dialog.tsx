
"use client";

import React, { useState } from 'react';
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
import { type User } from '@/lib/types';
import { Loader2, Save, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { updateUser } from '../actions';
import { NumericInput } from '@/components/ui/numeric-input';

const formSchema = z.object({
  baseSalary: z.coerce.number().min(0, "الراتب يجب أن يكون رقمًا موجبًا.").default(0),
  bonuses: z.coerce.number().min(0, "الحوافز يجب أن تكون رقمًا موجبًا.").default(0),
  deductions: z.coerce.number().min(0, "الاستقطاعات يجب أن تكون رقمًا موجبًا.").default(0),
  ticketProfit: z.coerce.number().min(0).optional(),
  visaProfit: z.coerce.number().min(0).optional(),
  groupProfit: z.coerce.number().min(0).optional(),
  changeProfit: z.coerce.number().min(0).optional(),
  segmentProfit: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditHrDataDialogProps {
  user: User;
  children: React.ReactNode;
  onSuccess: () => void;
}

const AmountInput = ({ field, label }: { field: any, label: string }) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="relative">
             <FormControl>
                <NumericInput className="ps-7" {...field} onValueChange={field.onChange} />
             </FormControl>
             <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <FormMessage />
    </FormItem>
);


export default function EditHrDataDialog({ user, children, onSuccess }: EditHrDataDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        baseSalary: user.baseSalary || 0,
        bonuses: user.bonuses || 0,
        deductions: user.deductions || 0,
        notes: user.notes || '',
        ticketProfit: user.ticketProfit || 0,
        visaProfit: user.visaProfit || 0,
        groupProfit: user.groupProfit || 0,
        changeProfit: user.changeProfit || 0,
        segmentProfit: user.segmentProfit || 0,
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const result = await updateUser(user.uid, data);
    if (result.success) {
        toast({ title: `تم تحديث بيانات ${user.name} بنجاح` });
        onSuccess();
        setOpen(false);
    } else {
        toast({ title: "خطأ", description: result.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader>
                    <DialogTitle>تعديل البيانات المالية لـ: {user.name}</DialogTitle>
                    <DialogDescription>
                        أدخل القيم الجديدة للراتب والحوافز والاستقطاعات والأرباح. سيتم إرسال إشعار للموظف.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 grid md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-base">بيانات الراتب</h4>
                        <FormField control={form.control} name="baseSalary" render={({ field }) => ( <AmountInput field={field} label="الراتب الأساسي" /> )}/>
                        <FormField control={form.control} name="bonuses" render={({ field }) => ( <AmountInput field={field} label="الحوافز / المكافآت" /> )}/>
                        <FormField control={form.control} name="deductions" render={({ field }) => ( <AmountInput field={field} label="الاستقطاعات / الخصومات" /> )}/>
                    </div>
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-base">الأرباح الإضافية</h4>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <FormField control={form.control} name="ticketProfit" render={({ field }) => ( <AmountInput field={field} label="أرباح التذاكر" /> )}/>
                            <FormField control={form.control} name="visaProfit" render={({ field }) => ( <AmountInput field={field} label="أرباح الفيزا" /> )}/>
                            <FormField control={form.control} name="groupProfit" render={({ field }) => ( <AmountInput field={field} label="أرباح الكروبات" /> )}/>
                            <FormField control={form.control} name="changeProfit" render={({ field }) => ( <AmountInput field={field} label="أرباح التغييرات" /> )}/>
                            <FormField control={form.control} name="segmentProfit" render={({ field }) => ( <AmountInput field={field} label="أرباح السكمنت" /> )}/>
                         </div>
                    </div>

                    <div className="md:col-span-2">
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>ملاحظات (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        حفظ التعديلات
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
