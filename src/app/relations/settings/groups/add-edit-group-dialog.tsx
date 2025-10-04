
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
import { type CompanyGroup } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, "اسم المجموعة مطلوب"),
  type: z.enum(['client', 'supplier', 'both']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "اللون يجب أن يكون بصيغة hex"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditGroupDialogProps {
  isEditing?: boolean;
  group?: CompanyGroup;
  children: React.ReactNode;
  onSave: (group: CompanyGroup) => void;
}

export default function AddEditGroupDialog({ isEditing = false, group, children, onSave }: AddEditGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && group ? { ...group } : {
        name: '',
        type: 'client',
        color: '#f97316',
        description: ''
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const groupData: CompanyGroup = {
        id: isEditing && group ? group.id : `grp_${Date.now()}`,
        ...data
    };
    onSave(groupData);
    toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} المجموعة بنجاح` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                 <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}</DialogTitle>
                     <DialogDescription>
                        استخدم المجموعات لتصنيف العملاء والموردين وتطبيق إعدادات مخصصة.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 grid gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>اسم المجموعة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>نوع المجموعة</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="client">عملاء</SelectItem><SelectItem value="supplier">موردين</SelectItem><SelectItem value="both">كلاهما</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="color" render={({ field }) => ( <FormItem><FormLabel>لون التمييز</FormLabel><div className="relative"><FormControl><Input {...field} className="pr-12" /></FormControl><Input type="color" value={field.value} onChange={field.onChange} className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-10 p-1 bg-transparent border-none cursor-pointer"/></div><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>الوصف (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        {isEditing ? 'حفظ التعديلات' : 'إضافة المجموعة'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
