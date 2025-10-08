// src/components/login-form.tsx
"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔹 محاولة تسجيل دخول...");
      
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      
      console.log("✅ تسجيل الدخول نجح:", uid);

      // ✅ تأخير بسيط لضمان تحميل التوكن
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ✅ محاولة قراءة بيانات المستخدم من Firestore
      console.log("🔹 محاولة قراءة بيانات المستخدم...");
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        console.log("✅ ملف المستخدم موجود:", userDoc.data());
      } else {
        console.log("⚠️ ملف المستخدم غير موجود - سيتم إنشاؤه");
        
        // إنشاء ملف المستخدم
        await setDoc(userDocRef, {
          email: userCred.user.email,
          displayName: userCred.user.displayName || userCred.user.email?.split('@')[0],
          role: "user",
          createdAt: new Date(),
          status: "active"
        });
        console.log("✅ ملف المستخدم أنشئ بنجاح");
      }

      console.log("🔹 التوجيه إلى dashboard...");
      router.replace("/dashboard");

    } catch (err: any) {
      console.error("❌ خطأ في تسجيل الدخول:", err);
      
      if (err.code === 'permission-denied') {
        setError("خطأ في الصلاحيات. تأكد من إعدادات قاعدة البيانات.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("المستخدم غير موجود أو بيانات الاعتماد غير صالحة.");
      } else if (err.code === 'auth/wrong-password') {
        setError("كلمة المرور غير صحيحة.");
      } else {
        setError("فشل تسجيل الدخول: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>
          أدخل بيانات حسابك للوصول إلى لوحة التحكم
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                 <Link href="/auth/forgot-password" passHref>
                    <Button variant="link" className="px-0 text-xs h-auto">نسيت كلمة المرور؟</Button>
                </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin me-2" /> : null}
            {loading ? "جاري التحقق..." : "تسجيل الدخول"}
          </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
                ليس لديك حساب؟{' '}
                <Link href="/auth/register" className="font-bold hover:underline text-primary">
                    اطلب حسابًا جديدًا
                </Link>
            </div>
        </form>
      </CardContent>
    </Card>
  );
}
