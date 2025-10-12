
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from 'nprogress';

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const handleStart = () => NProgress.start();
    const handleStop = () => NProgress.done();

    // The following is a workaround for the fact that Next.js's navigation events
    // are not firing consistently. This is a known issue.
    handleStart();
    const timeout = setTimeout(() => {
        handleStop();
    }, 200); // Stop after a short delay regardless

    return () => {
        clearTimeout(timeout);
        handleStop();
    };
    
  }, [pathname, searchParams]);

  return null;
}
