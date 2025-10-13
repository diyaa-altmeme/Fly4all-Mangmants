
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
// Removed global CSS import from here
import { Providers } from "@/components/layout/providers";

const tajawal = Tajawal({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  variable: '--font-tajawal'
});

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
      <body className={tajawal.variable}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
