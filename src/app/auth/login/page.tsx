// src/app/auth/login/page.tsx
"use client";

import React from "react";
import LoginForm from "@/components/login-form";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Preloader from "@/components/layout/preloader";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || user) {
    return <Preloader />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
            <LoginForm />
        </div>
    </div>
  );
}
