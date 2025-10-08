
"use client"

import React from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";


const formSchema = z.object({
  identifier: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صحيح" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

type FormValues = z.infer<typeof formSchema>;


export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { setAuthLoading } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "admin@mudarib.com",
      password: "123456",
    }
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: FormValues) => {
    setAuthLoading(true);
    try {
        const auth = getAuth(app);
        // This will trigger the onIdTokenChanged listener in AuthProvider
        await signInWithEmailAndPassword(auth, data.identifier, data.password);
        // The listener will handle session creation and redirection.
    } catch(error: any) {
        let errorMessage = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "صيغة البريد الإلكتروني غير صحيحة.";
        }
        toast({ title: "خطأ في تسجيل الدخول", description: errorMessage, variant: 'destructive' });
        setAuthLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem className="grid gap-2 text-right">
              <Label htmlFor="identifier">البريد الإلكتروني</Label>
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
                 <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} required {...field} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
