
"use client";

import * as React from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeCustomizationProvider } from "@/context/theme-customization-context";
import { VoucherNavProvider } from '@/context/voucher-nav-context';
import { AuthProvider } from '@/lib/auth-context';
import { MainLayout } from './main-layout';

export function Providers({ 
  children,
}: { 
  children: React.ReactNode,
}) {
    return (
      <AuthProvider>
        <VoucherNavProvider>
            <ThemeCustomizationProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <MainLayout>
                        {children}
                    </MainLayout>
                    <Toaster />
                </ThemeProvider>
            </ThemeCustomizationProvider>
        </VoucherNavProvider>
      </AuthProvider>
    )
}
