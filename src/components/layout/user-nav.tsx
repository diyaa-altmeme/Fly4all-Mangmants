"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User2, CircleUserRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function UserNav() {
  const { user, signOut } = useAuth();
  const name = user?.name || "مستخدم";
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback>{initials || <CircleUserRound />}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" dir="rtl">
        <div className="px-2 py-1 text-sm font-bold">{name}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="w-full justify-between flex items-center">
            <span>الملف الشخصي</span>
            <User2 className="h-4 w-4 ms-2" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="w-full justify-between flex items-center">
            <span>الإعدادات</span>
            <Settings className="h-4 w-4 ms-2" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="justify-between text-destructive focus:text-destructive">
          <span>تسجيل الخروج</span>
          <LogOut className="h-4 w-4 ms-2" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
