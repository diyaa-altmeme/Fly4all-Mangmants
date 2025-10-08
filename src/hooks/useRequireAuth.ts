
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to check for redirection after the initial loading is complete.
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  return { user, loading };
}
