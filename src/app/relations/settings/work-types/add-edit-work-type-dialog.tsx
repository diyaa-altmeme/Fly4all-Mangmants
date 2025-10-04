
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
import { type WorkType } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  name: z.string().min(2, "اسم النوع مطلوب"),
  appliesTo: z.array(z.string()).refine(value => value.some(item => item), {
    message: "يجب تحديد نوع واحد على الأقل.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditWorkTypeDialogProps {
  isEditing?: boolean;
  workType?: WorkType;
  children: React.ReactNode;
  onSave: (workType: WorkType) => void;
}

export default function AddEditWorkTypeDialog({ isEditing = false, workType, children, onSave }: AddEditWorkTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing && workType ? { ...workType } : {
        name: '',
        appliesTo: [],
    }
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: FormValues) => {
    const workTypeData: WorkType = {
        id: isEditing && workType ? workType.id : `wt_${Date.now()}`,
        name: data.name,
        appliesTo: data.appliesTo as ('client' | 'supplier')[],
    };
    onSave(workTypeData);
    toast({ title: `تم ${isEditing ? 'تحديث' : 'إضافة'} نوع العمل بنجاح` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                 <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل نوع العمل' : 'إضافة نوع عمل جديد'}</DialogTitle>
                     <DialogDescription>
                        استخدم أنواع العمل لتصنيف الشركات (عملاء وموردين) بشكل أفضل.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 grid gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>اسم نوع العمل</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     <FormField
                        control={form.control}
                        name="appliesTo"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">ينطبق على</FormLabel>
                                </div>
                                <div className="flex items-center gap-8">
                                    <FormField control={form.control} name="appliesTo" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 space-x-reverse">
                                             <FormControl>
                                                <Checkbox
                                                checked={field.value?.includes("client")}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...field.value, "client"])
                                                    : field.onChange(field.value?.filter((value) => value !== "client"))
                                                }}
                                                />
                                            </FormControl>
                                             <FormLabel className="font-normal">العملاء</FormLabel>
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="appliesTo" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 space-x-reverse">
                                             <FormControl>
                                                <Checkbox
                                                checked={field.value?.includes("supplier")}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...field.value, "supplier"])
                                                    : field.onChange(field.value?.filter((value) => value !== "supplier"))
                                                }}
                                                />
                                            </FormControl>
                                             <FormLabel className="font-normal">الموردين</FormLabel>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                        {isEditing ? 'حفظ التعديلات' : 'إضافة النوع'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
