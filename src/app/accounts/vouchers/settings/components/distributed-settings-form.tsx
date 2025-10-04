
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Save, PlusCircle, Trash2, RotateCcw } from "lucide-react";
import type { Client, Supplier, Box } from "@/lib/types";
import * as React from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Input } from "@/components/ui/input";
import { updateSettings } from "@/app/settings/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoucherNav } from "@/context/voucher-nav-context";


const distributionChannelSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "اسم الحقل مطلوب."),
  accountId: z.string().min(1, "يجب اختيار حساب."),
});

const formSchema = z.object({
  distributionChannels: z.array(distributionChannelSchema).optional(),
  dialogWidth: z.string().optional(),
  dialogHeight: z.string().optional(),
});

export type DistributedVoucherSettings = z.infer<typeof formSchema>;

interface DistributedSettingsFormProps {
    initialSettings?: DistributedVoucherSettings;
    onSaveSuccess?: () => void;
    onDimensionsChange?: (dims: { width?: string, height?: string }) => void;
}

export default function DistributedSettingsForm({ 
    initialSettings, 
    onSaveSuccess,
    onDimensionsChange,
}: DistributedSettingsFormProps) {
  const { toast } = useToast();
  const { data: navData } = useVoucherNav();


  const allAccounts = React.useMemo(() => {
    if (!navData) return [];
    const clientOptions = (navData.clients || []).map(c => ({ value: c.id, label: `عميل: ${c.name}` }));
    const supplierOptions = (navData.suppliers || []).map(s => ({ value: s.id, label: `مورد: ${s.name}` }));
    const boxOptions = (navData.boxes || []).map(b => ({ value: b.id, label: `صندوق: ${b.name}`}));
    return [...clientOptions, ...supplierOptions, ...boxOptions];
  }, [navData]);
  
  const form = useForm<DistributedVoucherSettings>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings || { 
        distributionChannels: [],
        dialogWidth: '1200px',
        dialogHeight: '700px',
    },
  });
  
  React.useEffect(() => {
      form.reset(initialSettings || { distributionChannels: [], dialogWidth: '1200px', dialogHeight: '700px' });
  }, [initialSettings, form]);

  const { formState: { isSubmitting }, control, handleSubmit, watch } = form;

  const watchedWidth = watch('dialogWidth');
  const watchedHeight = watch('dialogHeight');

  React.useEffect(() => {
    if (onDimensionsChange) {
      onDimensionsChange({ width: watchedWidth, height: watchedHeight });
    }
  }, [watchedWidth, watchedHeight, onDimensionsChange]);


  const { fields, append, remove } = useFieldArray({
      control,
      name: "distributionChannels"
  });
  
  const onSubmit = async (data: DistributedVoucherSettings) => {
    const result = await updateSettings({ voucherSettings: { distributed: data } });
    if (result.success) {
        toast({ title: "تم حفظ الإعدادات بنجاح" });
        if (onSaveSuccess) {
            onSaveSuccess();
        }
    } else {
        toast({ title: "خطأ", description: result.error, variant: 'destructive' });
    }
  };

  const handleResetDimensions = async () => {
    form.setValue('dialogWidth', '1200px');
    form.setValue('dialogHeight', '700px');
    if (onDimensionsChange) {
        onDimensionsChange({ width: '1200px', height: '700px' });
    }
    await onSubmit(form.getValues());
  }

  return (
    <Card className="mt-4 border-none shadow-none">
        <CardContent className="p-0">
            <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                     <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                             <h4 className="font-semibold text-base">أبعاد النافذة</h4>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button type="button" variant="ghost" size="sm">
                                      <RotateCcw className="me-2 h-4 w-4"/> إعادة للوضع الافتراضي
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                        <AlertDialogDescription>سيتم إعادة أبعاد النافذة إلى الحجم الافتراضي.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetDimensions} className={cn(buttonVariants({ variant: 'destructive' }))}>نعم، قم بالإعادة</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="dialogWidth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>عرض النافذة</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="مثال: 1400px أو 90vw" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="dialogHeight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>ارتفاع النافذة</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="مثال: 800px أو 90vh" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                     </div>
                     <div className="space-y-4">
                         <h4 className="font-semibold text-base">حقول التوزيع الإضافية (اختياري)</h4>
                         <p className="text-sm text-muted-foreground">
                            هنا يمكنك تحديد الحسابات الفرعية التي يمكن توزيع المبالغ عليها، مثل الفروع أو صناديق أخرى.
                         </p>
                        {fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-2 items-end border p-3 rounded-lg bg-muted/50">
                                <FormField
                                    control={form.control}
                                    name={`distributionChannels.${index}.label`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>اسم الحقل</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`distributionChannels.${index}.accountId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الحساب المرتبط</FormLabel>
                                             <FormControl>
                                                <Autocomplete options={allAccounts} value={field.value} onValueChange={field.onChange} placeholder="ابحث عن حساب..." />
                                             </FormControl>
                                             <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `dist_${Date.now()}`, label: 'حقل جديد', accountId: '' })}>
                            <PlusCircle className="me-2 h-4 w-4"/>
                            إضافة حقل توزيع فرعي
                        </Button>
                    </div>

                     <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            <Save className="me-2 h-4 w-4" />
                            حفظ الإعدادات
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
