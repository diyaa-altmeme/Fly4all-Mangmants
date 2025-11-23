
"use client";

import React from "react";
import { MainLayout as AppLayout } from "@/components/layout/main-layout";

// This layout is intentionally simple. 
// The main layout logic is handled by the Providers and MainLayout components.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
