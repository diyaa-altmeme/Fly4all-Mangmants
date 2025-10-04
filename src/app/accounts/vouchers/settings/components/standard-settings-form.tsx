
"use client";

import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSettings } from "@/app/settings/actions";
import { Loader2, Save } from "lucide-react";
import type { Box, VoucherTypeSettings } from "@/lib/types";
import { defaultVoucherTypeSettings } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as React from 'react';

const formSchema = z.object({
  autoNumbering: z.boolean().default(true),
  prefix: z.string().optional(),
  allowManualEntry: z.boolean().default(false),
  defaultCurrency: z.enum(["USD", "IQD"]).default("USD"),
  useDialogMode: z.boolean().default(true),
  allowedBoxes: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StandardSettingsFormProps {
    initialSettings?: VoucherTypeSettings;
    availableBoxes: Box[];
    onSaveSuccess: () => void;
}

export function StandardSettingsForm({ initialSettings, availableBoxes, onSaveSuccess }: StandardSettingsFormProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaultVoucherTypeSettings, ...initialSettings },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: FormValues) => {
    const result = await updateSettings({ voucherSettings: { standard: data } });
    if (result.success) {
        toast({ title: "تم حفظ الإعدادات بنجاح" });
        onSaveSuccess();
    } else {
        toast({ title: "خطأ", description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Card className="mt-4">
        <CardHeader>
            <CardTitle>إعدادات سند القبض العادي</CardTitle>
            <CardDescription>
                تخصيص سلوك وترقيم سندات القبض العادية في النظام.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-base">إعدادات الترقيم</h4>
                            <FormField
                                control={form.control}
                                name="autoNumbering"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>ترقيم تلقائي</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="prefix"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>بادئة الرقم (Prefix)</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="مثال: RCPT-" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="allowManualEntry"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>السماح بالإدخال اليدوي للرقم</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-semibold text-base">إعدادات المحتوى والسلوك</h4>
                             <FormField
                                control={form.control}
                                name="defaultCurrency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>العملة الافتراضية</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="IQD">IQD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            {/* The component for this is not built yet, so it is commented out for now.
                            <FormField
                                control={form.control}
                                name="allowedBoxes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الصناديق المسموح بها</FormLabel>
                                        <FormControl>
                                           <p className="text-sm text-muted-foreground">مكون اختيار الصناديق المتعددة سيبنى هنا.</p>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            */}
                             <FormField
                                control={form.control}
                                name="useDialogMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>استخدام نافذة منبثقة للإدخال</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
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
