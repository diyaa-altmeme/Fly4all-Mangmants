"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Preloader from "@/components/layout/preloader";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // AuthProvider shows a preloader, so we just handle the redirection logic here.
    if (loading) {
      return; 
    }

    if (user) {
      // If the user is a client, redirect them to their specific client page.
      if ('isClient' in user && user.isClient) {
          router.replace(`/clients/${user.id}`);
      } else {
          router.replace("/dashboard");
      }
    } else {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  return <Preloader />;
}
