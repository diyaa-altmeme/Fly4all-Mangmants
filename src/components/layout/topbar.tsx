
"use client";

import React from "react";
import { MainNav } from "./main-nav";
import CreateNewMenu from "./create-new-menu";
import { GlobalSearch } from "./global-search";
import NotificationCenter from "./notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "./user-nav";
import { SidebarTrigger } from "../ui/sidebar";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";

export default function TopBar() {
  return (
    <div className="w-full">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden">
                <Menu/>
            </SidebarTrigger>
          <CreateNewMenu />
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
    </div>
  );
}
