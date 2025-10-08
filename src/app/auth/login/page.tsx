
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
    // Wait for the auth state to be confirmed
    if (loading) return;

    // If a user is found, redirect them away from the login page
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // While loading, or if the user is already being redirected, show a loader
  if (loading || user) {
    return <Preloader />;
  }

  // Only render the login form if there is no user and loading is complete
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
            <LoginForm />
        </div>
    </div>
  );
}
