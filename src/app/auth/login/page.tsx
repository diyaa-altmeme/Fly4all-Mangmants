
'use client';
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">تسجيل الدخول</h1>
      <form onSubmit={handleLogin} className="flex flex-col w-80 gap-3">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button className="bg-green-600 text-white p-2 rounded">دخول</button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
      <div className="mt-4 text-center text-sm">
        <p>
            ليس لديك حساب؟{' '}
            <Link href="/register" className="underline">
                إنشاء حساب جديد
            </Link>
        </p>
        <p className="mt-2">
            <Link href="/auth/forgot-password" className="underline">
                نسيت كلمة المرور؟
            </Link>
        </p>
      </div>
    </div>
  );
}
