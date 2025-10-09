
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import LoginForm from "@/components/auth/login-form";
import Preloader from "@/components/layout/preloader";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is not loading and a user is found, redirect to dashboard.
    // The MainLayout will handle the initial loading state.
    if (!loading && user) {
        router.replace("/dashboard");
    }
  }, [user, loading, router]);
  
  // If loading, show the preloader. This covers the flicker between
  // initial page load and the effect running.
  if (loading) {
    return <Preloader />;
  }

  // If not loading and no user, show the login form.
  if (!user) {
    return <LoginForm />;
  }
  
  // If user exists, we are in the process of redirecting, so show preloader.
  return <Preloader />;
}
