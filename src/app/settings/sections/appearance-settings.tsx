
"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

// This component is deprecated and its functionality is now in /settings/themes/page.tsx
export default function AppearanceSettings() {
    useEffect(() => {
        redirect('/settings');
    }, []);
    return null;
}
