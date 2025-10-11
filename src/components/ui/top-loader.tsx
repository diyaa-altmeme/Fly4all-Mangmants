
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// NProgress functionality is disabled to prevent full page reloads on navigation,
// which was causing session issues in preview environments.
export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Original NProgress.done() call removed.
  }, [pathname, searchParams]);

  return null;
}
