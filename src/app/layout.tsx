
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";
import "./landing-page.css";


const tajawal = Tajawal({ 
  subsets: ["arabic"],
  weight: ["400", "700", "900"],
  variable: '--font-tajawal'
});

export const metadata: Metadata = {
  title: "Mudarib Accounting",
  description: "نظام محاسبي متكامل لشركات السفر والسياحة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning={true}>
       <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
       </head>
      <body className={tajawal.variable}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
