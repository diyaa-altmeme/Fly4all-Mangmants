"use client";

import React from "react";
import { MainNav } from "./main-nav";
import { GlobalSearch } from "./global-search";
import NotificationCenter from "./notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "./user-nav";
import { SidebarTrigger } from "../ui/sidebar";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TopBar() {
    const isMobile = useIsMobile();
  return (
    <div className="container mx-auto px-4 w-full h-14 flex items-center gap-3">
        <div className="flex items-center gap-2">
            {isMobile && (
                 <SidebarTrigger>
                    <Menu />
                </SidebarTrigger>
            )}
        </div>
        <div className="flex-1 hidden md:block">
           <MainNav />
        </div>
        <div className="ms-auto flex items-center gap-2">
           <div className="hidden sm:block">
             <GlobalSearch />
           </div>
          <ThemeToggle />
          <NotificationCenter />
          <UserNav />
        </div>
      </div>
  );
}
