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
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateClient } from '@/app/clients/actions';

const formSchema = z.object({
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
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
    defaultValues: { password: '' }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const result = await updateClient(clientId, { password: data.password });

    if (result.success) {
        toast({ title: "تم تحديث كلمة المرور بنجاح" });
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
                     <DialogDescription>
                        أدخل كلمة مرور جديدة لحسابك.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 grid gap-4">
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>كلمة المرور الجديدة</FormLabel>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl>
                                <Input type="password" placeholder="******" {...field} className="pr-10"/>
                                </FormControl>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        حفظ كلمة المرور الجديدة
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
