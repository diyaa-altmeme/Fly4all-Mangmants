
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
import { createAccount, generateAccountCode } from '../actions';
import type { TreeNode } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(2, "اسم الحساب مطلوب."),
  type: z.string().min(1, "نوع الحساب مطلوب."),
  parentId: z.string().nullable(),
  isLeaf: z.boolean().default(true),
  code: z.string(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAccountDialogProps {
  allAccounts: TreeNode[];
  onAccountAdded: () => void;
  children: React.ReactNode;
}

export default function AddAccountDialog({ allAccounts, onAccountAdded, children }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'asset',
      parentId: null,
      isLeaf: true,
      code: '',
      description: '',
    },
  });

  const parentId = form.watch('parentId');

  useEffect(() => {
    if (parentId) {
      const parentNode = findNodeById(allAccounts, parentId);
      if (parentNode) {
        form.setValue('type', parentNode.type);
      }
    }
  }, [parentId, allAccounts, form]);
  
  useEffect(() => {
    if(open) {
        handleGenerateCode();
    }
  }, [open, parentId]);


  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const flattenTree = (nodes: TreeNode[]): { label: string; value: string }[] => {
    let flat: { label: string; value: string }[] = [];
    nodes.forEach(node => {
      flat.push({ label: `${node.code} - ${node.name}`, value: node.id });
      if (node.children) {
        flat = flat.concat(flattenTree(node.children));
      }
    });
    return flat;
  };
  const accountOptions = [{ label: 'رئيسي (بدون أب)', value: 'root' }, ...flattenTree(allAccounts)];

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const parentIdVal = form.getValues('parentId');
      const code = await generateAccountCode(parentIdVal === 'root' ? undefined : parentIdVal || undefined);
      form.setValue('code', code);
    } catch (e: any) {
      toast({ title: 'خطأ', description: `فشل إنشاء الكود: ${e.message}`, variant: 'destructive' });
    } finally {
      setIsGeneratingCode(false);
    }
  };
  
  const handleSubmit = async (data: FormValues) => {
    try {
        const payload = {
            ...data,
            parentId: data.parentId === 'root' ? null : data.parentId,
        };
      await createAccount(payload);
      toast({ title: 'تمت إضافة الحساب بنجاح' });
      onAccountAdded();
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>إضافة حساب جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الحساب الجديد في شجرة الحسابات.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
                <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الحساب الأب</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === 'root' ? null : v)} value={field.value || undefined}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="اختر الحساب الأب..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {accountOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
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
                            <SelectItem value="liability">خصوم</SelectItem>
                            <SelectItem value="equity">حقوق ملكية</SelectItem>
                            <SelectItem value="revenue">إيرادات</SelectItem>
                            <SelectItem value="expense">مصروفات</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="isLeaf" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel>هل هو حساب فرعي (Leaf)؟</FormLabel>
                    </FormItem>
                )}/>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                <Save className="me-2 h-4 w-4" /> إضافة الحساب
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
