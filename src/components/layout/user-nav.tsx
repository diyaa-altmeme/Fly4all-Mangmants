
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-auto px-2 flex items-center gap-2">
           <span className="font-semibold hidden sm:inline">{user.name}</span>
          <Avatar className="h-9 w-9 border-2 border-primary/50">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback><CircleUserRound className="h-6 w-6 text-muted-foreground"/></AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end" forceMount>
        <div className="p-4" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)' }}>
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary-foreground/50">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-2xl bg-primary-foreground text-primary"><CircleUserRound /></AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-primary-foreground">
                    <p className="text-lg font-bold">{user.name}</p>
                    <p className="text-xs font-medium text-primary-foreground/80 flex items-center gap-2">
                       {user.email}
                    </p>
                    {'role' in user && (
                      <p className="text-xs font-semibold text-primary-foreground/80 flex items-center gap-2">
                        {(roles => roles.find(r => r.id === user.role)?.name || user.role)}
                      </p>
                    )}
                </div>
            </div>
        </div>
        <DropdownMenuSeparator className="my-0"/>
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem asChild>
            <Link href="/profile" className="justify-end gap-2 text-base py-2">
              <span>الملف الشخصي</span>
              <User className="h-4 w-4" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="justify-end gap-2 text-base py-2">
              <span>الإعدادات</span>
              <Settings className="h-4 w-4" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/support" className="justify-end gap-2 text-base py-2">
                <span>الدعم والمساعدة</span>
                <LifeBuoy className="h-4 w-4" />
             </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-500 justify-end gap-2 m-2 text-base py-2">
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

