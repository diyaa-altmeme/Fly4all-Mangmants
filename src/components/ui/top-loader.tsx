
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// NProgress is disabled to prevent full page reloads on navigation.
// import NProgress from "nprogress";

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // NProgress.done();
  }, [pathname, searchParams]);

  return null;
}
