
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestPublicAccount } from "../../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(3, { message: "الاسم مطلوب (3 أحرف على الأقل)" }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صحيح" }),
  phone: z.string().min(10, { message: "الرجاء إدخال رقم هاتف صحيح" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function RegisterForm() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: FormValues) => {
    const result = await requestPublicAccount(data);
    if (result.success) {
      toast({ title: "تم إرسال طلبك بنجاح", description: "سيتم مراجعة طلبك من قبل الإدارة." });
      setIsSubmitted(true);
    } else {
      toast({ title: "خطأ في التسجيل", description: result.error, variant: "destructive" });
    }
  };

  if (isSubmitted) {
    return (
      <Card className="mt-4 border-none shadow-none">
        <CardContent className="flex flex-col items-center justify-center text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold">تم استلام طلبك</h3>
            <p className="text-muted-foreground mt-2">
                شكرًا لتسجيلك. سيتم مراجعة حسابك وتفعيله من قبل مسؤول النظام. ستصلك رسالة عند تفعيل الحساب.
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <FormControl>
                <Input id="name" placeholder="مثال: علي السعدي" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <FormControl>
                <Input id="email" type="email" placeholder="name@example.com" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <FormControl>
                <Input id="phone" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "جاري الإرسال..." : "إنشاء حساب"}
        </Button>
      </form>
    </Form>
  );
}
