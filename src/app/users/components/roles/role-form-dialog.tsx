
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addRole, updateUserRole } from '@/app/users/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RoleFormDialogProps {
  isEditing?: boolean;
  role?: Role;
  children: React.ReactNode;
  onRoleAdded?: () => void;
  onRoleUpdated?: () => void;
}

const formSchema = z.object({
    name: z.string().min(2, "اسم الدور مطلوب"),
    description: z.string().min(5, "الوصف مطلوب"),
});

type FormValues = z.infer<typeof formSchema>;

export default function RoleFormDialog({ 
    isEditing = false, 
    role, 
    children, 
    onRoleAdded,
    onRoleUpdated
}: RoleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: role?.name || '',
        description: role?.description || ''
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    try {
        if (isEditing && role) {
            const result = await updateUserRole(role.id, { name: data.name, description: data.description });
            if (!result.success) throw new Error(result.error);
            toast({ title: "تم تحديث الدور" });
            if (onRoleUpdated) onRoleUpdated();
        } else {
             const result = await addRole({ ...data, permissions: [] });
             if (!result.success) throw new Error(result.error);
             toast({ title: "تم إضافة الدور" });
             if (onRoleAdded) onRoleAdded();
        }
        setOpen(false);
        form.reset();
    } catch (error: any) {
         toast({ title: "خطأ", description: error.message, variant: 'destructive' });
    }
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
            <DialogTitle>{isEditing ? 'تعديل الدور' : 'إضافة دور جديد'}</DialogTitle>
            <DialogDescription>
                {isEditing ? 'قم بتحديث اسم ووصف الدور.' : 'أدخل اسمًا ووصفًا واضحين للدور الجديد.'}
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">اسم الدور</Label>
                    <Input id="name" {...form.register('name')} />
                    {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea id="description" {...form.register('description')} />
                     {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
                </div>
            </div>
            <DialogFooter>
                 <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء الدور'}
                 </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
