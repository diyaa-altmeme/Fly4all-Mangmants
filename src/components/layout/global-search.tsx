"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const [q, setQ] = useState("");

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث سريع في النظام…"
        className="ps-9 pe-3 h-9"
      />
    </div>
  );
}
