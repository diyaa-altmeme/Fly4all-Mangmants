"use client";

import * as React from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import TopLoader from "@/components/ui/top-loader";
import { MainLayout } from "@/components/layout/main-layout";
import type { AppSettings } from '@/lib/types';
import { ThemeCustomizationProvider } from "@/context/theme-customization-context";
import { AuthProvider } from "@/context/auth-context";

export function Providers({ 
  children,
}: { 
  children: React.ReactNode,
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
             <AuthProvider>
                <ThemeCustomizationProvider>
                    <React.Suspense fallback={null}>
                        <TopLoader />
                    </React.Suspense>
                    <MainLayout>
                        {children}
                    </MainLayout>
                    <Toaster />
                </ThemeCustomizationProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}
