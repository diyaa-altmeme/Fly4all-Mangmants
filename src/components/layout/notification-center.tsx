"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotificationCenter() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-80" dir="rtl">
        <div className="text-sm font-bold mb-2">الإشعارات</div>
        <div className="text-sm text-muted-foreground">لا إشعارات حاليًا.</div>
      </PopoverContent>
    </Popover>
  );
}
