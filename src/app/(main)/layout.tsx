"use client";

import React from "react";
import { cn } from "@/lib/utils";
import TopBar from "@/components/layout/topbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <TopBar />
      </header>

      <main className={cn("container mx-auto px-3 sm:px-4 md:px-6 py-4")}>
        {children}
      </main>
    </div>
  );
}
