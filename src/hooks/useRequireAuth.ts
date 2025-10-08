// src/hooks/useRequireAuth.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function useRequireAuth(redirectTo = "/auth/login") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to check for redirection after the initial loading is complete.
    if (loading) {
      return;
    }

    // If there's no user, redirect to the login page.
    // Using `replace` prevents the login page from being added to the history stack.
    if (!user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
}
