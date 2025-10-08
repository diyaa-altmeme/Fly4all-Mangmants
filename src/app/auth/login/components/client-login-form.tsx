
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
import { verifyOtpAndLogin } from "../../actions"
import OtpLoginForm from "./otp-login-form";
import { useAuth } from "@/context/auth-context";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const formSchema = z.object({
  identifier: z.string().min(1, { message: "الحقل مطلوب" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClientLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { setAuthLoading } = useAuth();
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
    try {
        await signInWithEmailAndPassword(auth, data.identifier, data.password);
        router.push('/dashboard');
        // Preloader will be turned off by MainLayout's loading state via onAuthStateChanged
    } catch(error: any) {
        let errorMessage = "فشل تسجيل الدخول.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "بيانات الدخول غير صحيحة.";
        }
        toast({ title: "خطأ في تسجيل الدخول", description: errorMessage, variant: 'destructive' });
        setAuthLoading(false);
    }
  }
  
  const handleOtpSubmit = async (otp: string) => {
    setAuthLoading(true);
    const result = await verifyOtpAndLogin(phoneForOtp, otp, 'client');
    if (result.success) {
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
            <FormItem className="grid gap-2 text-right">
              <Label htmlFor="identifier">البريد الإلكتروني، كود الشركة، أو معرف الدخول</Label>
              <FormControl>
                <Input
                  id="identifier"
                  placeholder="name@example.com"
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
            <FormItem className="grid gap-2 text-right">
              <div className="flex items-center">
                <Label htmlFor="password">كلمة المرور</Label>
                 <Link
                  href="/auth/forgot-password"
                  className="mr-auto inline-block text-sm underline"
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
