
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
import { Loader2, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { addWhatsappAccount, updateWhatsappAccount } from '../actions';
import type { WhatsappAccount } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, "اسم الحساب مطلوب."),
  provider: z.enum(['ultramsg', 'green-api']).default('ultramsg'),
  idInstance: z.string().min(5, "معرف النسخة مطلوب."),
  apiTokenInstance: z.string().min(10, "التوكن مطلوب."),
  isDefault: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditAccountDialogProps {
  isEditing?: boolean;
  account?: WhatsappAccount;
  onSaveSuccess: () => void;
  children: React.ReactNode;
}

export default function AddEditAccountDialog({ isEditing = false, account, onSaveSuccess, children }: AddEditAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && account ? account : {
        name: '',
        provider: 'ultramsg',
        idInstance: '',
        apiTokenInstance: '',
        isDefault: false,
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    try {
        let result;
        if (isEditing && account) {
            result = await updateWhatsappAccount(account.id, data);
        } else {
            result = await addWhatsappAccount(data);
        }

        if (result.success) {
            toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} الحساب بنجاح` });
            onSaveSuccess();
            setOpen(false);
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
         toast({ title: "خطأ", description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل حساب' : 'إضافة حساب جديد'}</DialogTitle>
                     <DialogDescription>
                        أدخل بيانات حساب WhatsApp الخاص بك.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 grid gap-4">
                    <FormField control={form.control} name="provider" render={({ field }) => ( <FormItem><FormLabel>مزود الخدمة</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="ultramsg">ultramsg.com</SelectItem><SelectItem value="green-api">green-api.com</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>الاسم المميز للحساب</FormLabel><FormControl><Input {...field} placeholder="مثال: حساب الشركة الرئيسي" /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="idInstance" render={({ field }) => ( <FormItem><FormLabel>Instance ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="apiTokenInstance" render={({ field }) => ( <FormItem><FormLabel>Token</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="isDefault" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>تعيين كافتراضي</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )}/>
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        {isEditing ? 'حفظ التعديلات' : 'إضافة الحساب'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
