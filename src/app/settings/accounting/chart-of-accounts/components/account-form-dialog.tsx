
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
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createAccount, generateAccountCode, updateAccount } from '../actions';
import type { TreeNode } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, "اسم الحساب مطلوب."),
  type: z.string().min(1, "نوع الحساب مطلوب."),
  parentId: z.string().nullable(),
  code: z.string().min(1, "الكود مطلوب."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AccountFormDialogProps {
  allAccounts: TreeNode[];
  onAccountAdded: () => void;
  children: React.ReactNode;
  isEditing?: boolean;
  account?: TreeNode;
  parentId?: string;
}

export default function AccountFormDialog({ allAccounts, onAccountAdded, children, isEditing = false, account, parentId: initialParentId }: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const parentId = form.watch('parentId');
  
  const flattenTree = (nodes: TreeNode[], level = 0): { label: string; value: string }[] => {
    let flat: { label: string; value: string }[] = [];
    nodes.forEach(node => {
        const prefix = '—'.repeat(level);
        flat.push({ label: `${prefix} ${node.code} - ${node.name}`, value: node.id });
        if (node.children) {
            flat = flat.concat(flattenTree(node.children, level + 1));
        }
    });
    return flat;
  };

  const accountOptions = [{ label: 'رئيسي (بدون أب)', value: 'root' }, ...flattenTree(allAccounts)];

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const parentIdVal = form.getValues('parentId');
      const code = await generateAccountCode(parentIdVal === 'root' ? null : parentIdVal);
      form.setValue('code', code);
    } catch (e: any) {
      toast({ title: 'خطأ', description: `فشل إنشاء الكود: ${e.message}`, variant: 'destructive' });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (isEditing && account) {
        form.reset({
          name: account.name,
          type: account.type,
          parentId: account.parentId,
          code: account.code,
          description: account.description
        });
      } else {
        const parentNode = initialParentId ? allAccounts.find(a => a.id === initialParentId) : null;
        form.reset({
          name: '',
          type: parentNode ? parentNode.type : 'asset',
          parentId: initialParentId || null,
          code: '',
          description: ''
        });
        handleGenerateCode();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, account, initialParentId, allAccounts, form]);
  
  useEffect(() => {
      if(parentId && !isEditing) handleGenerateCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, isEditing]);


  const handleSubmit = async (data: FormValues) => {
    try {
        let result;
        if(isEditing && account) {
             result = await updateAccount(account.id, data);
        } else {
             result = await createAccount(data);
        }
        toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} الحساب بنجاح` });
        onAccountAdded();
        setOpen(false);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? `تعديل حساب: ${account?.name}` : 'إضافة حساب جديد'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الحساب الجديد في شجرة الحسابات.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
                <FormField control={form.control} name="parentId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>الحساب الأب</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === 'root' ? null : v)} value={field.value || undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الحساب الأب..." /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="root">رئيسي (بدون أب)</SelectItem>{accountOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-[1fr,auto] gap-2">
                    <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>كود الحساب</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <Button type="button" onClick={handleGenerateCode} className="self-end" variant="outline" disabled={isGeneratingCode}>
                        {isGeneratingCode ? <Loader2 className="animate-spin h-4 w-4"/> : 'توليد'}
                    </Button>
                </div>
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>اسم الحساب</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                    <FormLabel>نوع الحساب</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="asset">أصول</SelectItem>
                            <SelectItem value="liability">التزامات</SelectItem>
                            <SelectItem value="equity">حقوق الملكية</SelectItem>
                            <SelectItem value="revenue">إيرادات</SelectItem>
                            <SelectItem value="expense">مصروفات</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>الوصف (اختياري)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Save className="me-2 h-4 w-4" /> {isEditing ? 'حفظ التعديلات' : 'إضافة الحساب'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
