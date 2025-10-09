
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "نظام الإدارة",
  description: "لوحة تحكم متكاملة لإدارة النظام",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <AuthProvider>
           <Providers>
              {children}
           </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
