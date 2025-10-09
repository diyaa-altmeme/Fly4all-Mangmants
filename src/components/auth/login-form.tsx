
"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { createSession } from "@/lib/auth/actions";
import { useAuth } from "@/lib/auth-context";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Sign in with Firebase client SDK
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCred.user.getIdToken();

      // Step 2: Call the server action to create a session cookie and get user data
      const sessionResult = await createSession(idToken);
      
      if (!sessionResult.success || !sessionResult.user) {
        throw new Error(sessionResult.error || "فشل إنشاء الجلسة.");
      }

      toast({ description: "تم تسجيل الدخول بنجاح! جاري التوجيه..." });
      
      // Full page reload to ensure all contexts are updated correctly
      window.location.href = '/';

    } catch (err: any) {
      console.error("Login error:", err);
      let friendlyMessage = err.message; 
      
      if (err.code) {
        switch (err.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
              friendlyMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
              break;
            case "auth/user-not-found":
              friendlyMessage = "المستخدم غير موجود.";
              break;
            case "auth/too-many-requests":
              friendlyMessage = "لقد حاولت تسجيل الدخول عدة مرات. يرجى المحاولة مرة أخرى لاحقًا.";
              break;
            case "auth/network-request-failed":
              friendlyMessage = "حدث خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
              break;
            default:
              friendlyMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
        }
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background/90">
        <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>
            أدخل بيانات حسابك للوصول إلى لوحة التحكم
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني أو معرف الدخول</Label>
                <Input
                id="email"
                type="text"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
            </div>

            {error && 
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
            }

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin me-2" /> : null}
                {loading ? "جاري التحقق..." : "تسجيل الدخول"}
            </Button>
            </form>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="link" asChild>
                <Link href="/auth/forgot-password">نسيت كلمة المرور؟</Link>
            </Button>
        </CardFooter>
        </Card>
    </div>
  );
}
