
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from 'nprogress';

// Configure NProgress appearance
NProgress.configure({ showSpinner: false });

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Start progress bar on route change
    NProgress.start();
    
    // Using a timeout as a reliable way to ensure it completes,
    // especially for fast page loads.
    const timer = setTimeout(() => NProgress.done(), 500);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
