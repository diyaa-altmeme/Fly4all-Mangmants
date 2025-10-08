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
import type { Client } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateClient } from '@/app/clients/actions';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  avatarUrl: z.string().url("الرابط غير صحيح").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangeAvatarDialogProps {
  client: Client;
  onAvatarChanged: () => void;
  children: React.ReactNode;
}

export default function ChangeAvatarDialog({ client, onAvatarChanged, children }: ChangeAvatarDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        avatarUrl: client.avatarUrl || ''
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const result = await updateClient(client.id, { avatarUrl: data.avatarUrl });

    if (result.success) {
        toast({ title: "تم تحديث الصورة الرمزية بنجاح" });
        onAvatarChanged();
        router.refresh();
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
                    <DialogTitle>تغيير الصورة الرمزية</DialogTitle>
                    <DialogDescription>
                        الصق رابطًا جديدًا لصورة رمزية. سيتم عرضها في ملفك الشخصي.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 grid gap-4">
                    <FormField
                        control={form.control}
                        name="avatarUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>رابط الصورة الجديد</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.png" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        <Save className="me-2 h-4 w-4" />
                        حفظ الصورة
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
