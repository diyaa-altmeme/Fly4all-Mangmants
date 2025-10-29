"use client";

import React from "react";
import { MainNav } from "./main-nav";
import CreateNewMenu from "./create-new-menu";
import { GlobalSearch } from "./global-search";
import NotificationCenter from "./notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "./user-nav";

export default function TopBar() {
  return (
    <div className="w-full">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CreateNewMenu />
        </div>
        <div className="flex-1 max-w-2xl">
          <GlobalSearch />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
          <NotificationCenter />
          <UserNav />
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <MainNav />
        </div>
      </div>
    </div>
  );
}
