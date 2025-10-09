
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
import { createSession, verifyUserByEmail } from "@/lib/auth/actions";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Verify user existence and status on the server
      const userVerification = await verifyUserByEmail(email);

      if (!userVerification || !userVerification.exists || userVerification.error) {
        throw new Error(userVerification.error || "المستخدم غير موجود.");
      }
      
      if (userVerification.status !== 'active') {
          throw new Error("هذا الحساب غير نشط. يرجى مراجعة المسؤول.");
      }

      // Step 2: If user exists and is active, proceed with password authentication
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCred.user.getIdToken();

      // Step 3: Create server-side session
      await createSession(idToken);
      
      toast({ description: "تم تسجيل الدخول بنجاح! جاري التوجيه..." });
      
      // Full page reload to re-evaluate server components and auth context
      window.location.href = '/dashboard';

    } catch (err: any) {
      console.error("Login error:", err);
      // Use the message from our server-side check first, or fallback to firebase errors
      let friendlyMessage = err.message; 
      
      if (err.code) { // Firebase auth errors have a 'code' property
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
