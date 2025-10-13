
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Settings, CircleUserRound, Mail, Phone, Calendar, Shield, LifeBuoy } from "lucide-react";
import Link from 'next/link';

export function UserNav() {
  const { user, signOut } = useAuth();
  
  if (!user) return null;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 space-x-reverse group">
              <div className="relative">
                  <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback><CircleUserRound /></AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></span>
              </div>
              <span className="hidden md:inline font-medium">{user.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="font-medium">{user.name}</p>
              {'role' in user && <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>}
          </div>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center justify-end w-full">
              الملف الشخصي <User className="ml-2 h-4 w-4" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center justify-end w-full">
              الإعدادات <Settings className="ml-2 h-4 w-4" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-500 flex items-center justify-end w-full">
            تسجيل خروج <LogOut className="ml-2 h-4 w-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

    