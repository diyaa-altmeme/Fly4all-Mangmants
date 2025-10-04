
import type { Metadata } from "next";
import "./globals.css";
import { Tajawal } from 'next/font/google'
import { Providers } from "@/components/layout/providers";

const tajawal = Tajawal({
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: "Mudarib Accounting",
  description: "نظام محاسبي متكامل لشركات السفر والسياحة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning={true} className={tajawal.variable}>
        <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css" />
        </head>
        <body className={`font-sans antialiased bg-background`}>
            <Providers>
                {children}
            </Providers>
        </body>
    </html>
  );
}
