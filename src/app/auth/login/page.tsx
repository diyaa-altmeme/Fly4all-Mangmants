
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import LoginForm from "@/components/auth/login-form";
import Preloader from "@/components/layout/preloader";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
        setIsRedirecting(true);
        router.replace("/dashboard");
    }
  }, [user, loading, router]);
  
  if (loading || isRedirecting) {
    return <Preloader />;
  }

  if (!user) {
    return <LoginForm />;
  }
  
  return <Preloader />;
}
