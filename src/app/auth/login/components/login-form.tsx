
"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { loginUser, verifyOtpAndLogin } from "../../actions"
import OtpLoginForm from "./otp-login-form";
import { useAuth } from "@/context/auth-context";
import { useVoucherNav } from "@/context/voucher-nav-context";

const formSchema = z.object({
  identifier: z.string().min(1, { message: "الحقل مطلوب" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

type FormValues = z.infer<typeof formSchema>;


export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshUser, setAuthLoading } = useAuth();
  const { fetchData } = useVoucherNav();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [phoneForOtp, setPhoneForOtp] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    }
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: FormValues) => {
    setAuthLoading(true);
    const result = await loginUser(data.identifier, data.password, 'employee');
    
    if (result.success) {
      if (result.otp_required && result.phone) {
        setAuthLoading(false); // Stop preloader for OTP step
        toast({ title: "التحقق مطلوب", description: "تم إرسال رمز التحقق إلى الواتساب الخاص بك." });
        setPhoneForOtp(result.phone);
        setStep('otp');
      } else {
        await refreshUser();
        await fetchData(true); // Force refetch of nav data
        router.push('/dashboard');
        // The preloader will be turned off by the MainLayout's loading state
      }
    } else {
      setAuthLoading(false);
      toast({ title: "خطأ في تسجيل الدخول", description: result.error, variant: 'destructive' });
    }
  }

  const handleOtpSubmit = async (otp: string) => {
    setAuthLoading(true);
    const result = await verifyOtpAndLogin(phoneForOtp, otp, 'employee');
    if (result.success) {
      await refreshUser();
      await fetchData(true);
      router.push('/dashboard');
    } else {
      setAuthLoading(false);
      toast({ title: "خطأ", description: result.error, variant: 'destructive' });
    }
  }

  if (step === 'otp') {
    return <OtpLoginForm phone={phoneForOtp} onVerify={handleOtpSubmit} onBack={() => setStep('credentials')} />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <Label htmlFor="identifier">اسم المستخدم أو البريد الإلكتروني</Label>
              <FormControl>
                <Input
                  id="identifier"
                  placeholder="username or name@example.com"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  هل نسيت كلمة المرور؟
                </Link>
              </div>
              <FormControl>
                <Input id="password" type="password" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
        </Button>
      </form>
    </Form>
  )
}
