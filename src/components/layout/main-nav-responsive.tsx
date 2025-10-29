
"use client";

import React, { useState } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Rocket, X } from 'lucide-react';
import { MainNav } from './main-nav'; // This is now MainNavContent effectively

export default function MainNavResponsive() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    return (
        <div className="flex items-center w-full md:hidden">
            {/* Mobile Menu */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6"/>
                        <span className="sr-only">Toggle Navigation</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                    <SheetHeader className="p-4 flex flex-row items-center justify-between border-b shrink-0 text-right">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
                                <Rocket className="text-white"/>
                            </div>
                            <span className="text-primary font-bold">Mudarib</span>
                        </SheetTitle>
                         <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </SheetHeader>
                    <div className="flex-grow overflow-y-auto">
                        <MainNav isMobile={true} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

