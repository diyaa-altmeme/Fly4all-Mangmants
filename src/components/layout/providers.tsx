
"use client";

import * as React from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeCustomizationProvider } from "@/context/theme-customization-context";
import { VoucherNavProvider } from '@/context/voucher-nav-context';
import { AuthProvider } from '@/lib/auth-context';
import { MainLayout } from './main-layout';
import { TranslationProvider } from '@/i18n';

export function Providers({ 
  children,
}: { 
  children: React.ReactNode,
}) {
    return (
      <TranslationProvider>
        <AuthProvider>
          <VoucherNavProvider>
              <ThemeCustomizationProvider>
                  <ThemeProvider
                      attribute="class"
                      defaultTheme="system"
                      enableSystem
                      disableTransitionOnChange
                  >
                      {children}
                      <Toaster />
                  </ThemeProvider>
              </ThemeCustomizationProvider>
          </VoucherNavProvider>
        </AuthProvider>
      </TranslationProvider>
    )
}
