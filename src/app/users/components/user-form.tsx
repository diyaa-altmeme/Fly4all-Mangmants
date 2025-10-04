
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save } from 'lucide-react';
import { addUser, updateUser } from '../actions';
import { useToast } from '@/hooks/use-toast';
import type { User, Box, Role } from '@/lib/types';
import { DialogFooter } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';

const userFormSchema = z.object({
  name: z.string().min(3, "الاسم مطلوب (3 أحرف على الأقل)"),
  username: z.string().min(3, "اسم المستخدم مطلوب (3 أحرف على الأقل)").regex(/^[a-zA-Z0-9_.]+$/, "اسم المستخدم يمكن أن يحتوي على حروف وأرقام ونقاط وشرطات سفلية فقط."),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(10, "رقم الهاتف غير صحيح"),
  role: z.string().min(1, "الدور مطلوب"),
  status: z.enum(['active', 'pending', 'blocked', 'rejected']),
  department: z.string().optional(),
  position: z.string().optional(),
  boxId: z.string().optional(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل.").optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  baseSalary: z.coerce.number().min(0).optional(),
  otpLoginEnabled: z.boolean().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  isEditing?: boolean;
  initialData?: User;
  boxes: Box[];
  roles: Role[];
  onSuccess: () => void;
}

export default function UserForm({ isEditing = false, initialData, boxes, roles, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      role: initialData?.role || '',
      status: initialData?.status || 'pending',
      department: initialData?.department || '',
      position: initialData?.position || '',
      boxId: initialData?.boxId || '',
      password: '',
      avatarUrl: initialData?.avatarUrl || '',
      baseSalary: initialData?.baseSalary || 0,
      otpLoginEnabled: initialData?.otpLoginEnabled || false,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (isEditing && initialData) {
        const result = await updateUser(initialData.uid, data);
        if (result.success && result.updatedUser) {
          toast({ title: 'تم تحديث المستخدم بنجاح' });
          onSuccess();
        } else {
          throw new Error(result.error);
        }
      } else {
        if (!data.password) {
          form.setError("password", { message: "كلمة المرور مطلوبة عند إنشاء مستخدم جديد" });
          return;
        }
        const result = await addUser(data as any);
        if (result.success && result.newUser) {
           toast({ title: 'تم إضافة المستخدم بنجاح' });
          onSuccess();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>الاسم الكامل<span className="text-destructive ms-1">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>اسم المستخدم<span className="text-destructive ms-1">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>البريد الإلكتروني<span className="text-destructive ms-1">*</span></FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>رقم الهاتف<span className="text-destructive ms-1">*</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>كلمة المرور{isEditing ? '' : <span className="text-destructive ms-1">*</span>}</FormLabel><FormControl><Input type="password" placeholder={isEditing ? 'اتركه فارغًا لعدم التغيير' : 'مطلوب'} {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="avatarUrl" render={({ field }) => (<FormItem><FormLabel>رابط الصورة (اختياري)</FormLabel><FormControl><Input type="url" {...field} placeholder="https://example.com/avatar.png" /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>القسم</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>المنصب</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>الدور (الصلاحية)<span className="text-destructive ms-1">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دورًا..." /></SelectTrigger></FormControl><SelectContent>{(roles || []).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>حالة الحساب<span className="text-destructive ms-1">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="pending">قيد المراجعة</SelectItem><SelectItem value="blocked">محظور</SelectItem><SelectItem value="rejected">مرفوض</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="boxId" render={({ field }) => (<FormItem><FormLabel>الصندوق المرتبط (اختياري)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر صندوقًا..."/></SelectTrigger></FormControl><SelectContent>{(boxes || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="baseSalary" render={({ field }) => (<FormItem><FormLabel>الراتب الأساسي</FormLabel><FormControl><NumericInput onValueChange={field.onChange} value={field.value} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="otpLoginEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2"><FormLabel>تفعيل الدخول بـ OTP</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <DialogFooter className="pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
              {isEditing ? 'حفظ التعديلات' : 'إنشاء مستخدم'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
