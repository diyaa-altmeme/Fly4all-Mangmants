"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Preloader from "@/components/layout/preloader";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <Preloader />;
}
