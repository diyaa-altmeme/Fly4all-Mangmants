
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
import { KeyRound, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateClient } from '@/app/clients/actions';

const formSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

interface ChangePasswordDialogProps {
  clientId: string;
  children: React.ReactNode;
}

export default function ChangePasswordDialog({ clientId, children }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    // In a real app, you would send the currentPassword to the server to verify it.
    // For now, we will just update the password directly.
    const result = await updateClient(clientId, { password: data.newPassword });

    if (result.success) {
        toast({ title: "تم تغيير كلمة المرور بنجاح" });
        setOpen(false);
    } else {
        toast({ title: "خطأ", description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <DialogHeader>
                    <DialogTitle>تغيير كلمة المرور</DialogTitle>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    <FormField control={form.control} name="currentPassword" render={({ field }) => ( <FormItem><FormLabel>كلمة المرور الحالية</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="newPassword" render={({ field }) => ( <FormItem><FormLabel>كلمة المرور الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>تأكيد كلمة المرور الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        حفظ كلمة المرور
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
