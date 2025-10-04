

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
import { KeyRound, Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateClient } from '@/app/clients/actions';
import type { Client } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  loginIdentifier: z.string().min(3, "المعرف يجب أن يكون 3 أحرف على الأقل").optional().or(z.literal('')),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").optional().or(z.literal('')),
  otpLoginEnabled: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CredentialsDialogProps {
  client: Client;
  onCredentialsUpdated: (updatedClient?: Client) => void;
  children: React.ReactNode;
}

export default function CredentialsDialog({ client, onCredentialsUpdated, children }: CredentialsDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        loginIdentifier: client?.loginIdentifier || '',
        password: '',
        otpLoginEnabled: client?.otpLoginEnabled || false
    }
  });

  React.useEffect(() => {
    if (open) {
        form.reset({
            loginIdentifier: client?.loginIdentifier || '',
            password: '',
            otpLoginEnabled: client?.otpLoginEnabled || false
        });
    }
  }, [open, client, form]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    
    const dataToUpdate: Partial<Client> = {};
    if (data.loginIdentifier !== client.loginIdentifier) {
        dataToUpdate.loginIdentifier = data.loginIdentifier;
    }
    if (data.password) {
        dataToUpdate.password = data.password;
    }
     if (data.otpLoginEnabled !== client.otpLoginEnabled) {
        dataToUpdate.otpLoginEnabled = data.otpLoginEnabled;
    }

    if (Object.keys(dataToUpdate).length === 0) {
        toast({ title: "لا توجد تغييرات", description: "لم تقم بإدخال أي بيانات جديدة.", variant: "default" });
        return;
    }
    
    const result = await updateClient(client.id, dataToUpdate);

    if (result.success && result.updatedClient) {
        toast({ title: "تم تحديث بيانات الدخول بنجاح" });
        onCredentialsUpdated(result.updatedClient);
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
                    <DialogTitle>إدارة بيانات الدخول لـ: {client.name}</DialogTitle>
                    <DialogDescription>
                        استخدم هذا النموذج لتعيين أو تحديث معرف تسجيل الدخول وكلمة المرور.
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <FormField
                        control={form.control}
                        name="loginIdentifier"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>معرف تسجيل الدخول</FormLabel>
                            <FormControl>
                                <Input placeholder="اختر معرفًا فريدًا للعميل" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>كلمة المرور الجديدة</FormLabel>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl>
                                <Input type="password" placeholder="اتركه فارغًا لعدم التغيير" {...field} className="pr-10"/>
                                </FormControl>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="otpLoginEnabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>تفعيل الدخول بخطوتين (OTP)</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4"/>
                        حفظ التغييرات
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
