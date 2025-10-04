

"use client";

import React from 'react';
import type { DashboardSection } from './dashboard-config';
import { Button } from '@/components/ui/button';
import { EyeOff, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useVoucherNav } from '@/context/voucher-nav-context';
import { Loader2 } from 'lucide-react';

const ShortcutCard = ({ item, isEditing, onToggleVisibility }: { item: DashboardSection['items'][0], isEditing: boolean, onToggleVisibility: () => void }) => {
    const { data: navData, loaded: isDataLoaded } = useVoucherNav();
    
    const cardContent = (
         <div className="relative group flex items-center justify-end gap-3 p-3 h-full w-full">
            {isEditing && (
                 <div className="absolute top-1 right-1 flex items-center gap-1 bg-background/50 rounded-full z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); }}>
                        <EyeOff className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                </div>
            )}
             <h3 className="font-bold text-base flex-grow text-center">{item.title}</h3>
            <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                <item.icon className="h-6 w-6 text-primary transition-transform" />
            </motion.div>
        </div>
    );
    
    const cardComponent = (
        <Button
            variant="secondary"
            className="h-auto w-full p-0 flex items-center justify-center shadow-sm hover:shadow-lg transition-shadow"
            aria-label={item.title}
        >
            {cardContent}
        </Button>
    );

    const renderCard = () => {
        if (isEditing) {
            return <div className="h-full">{cardComponent}</div>;
        }

        if (item.dialog) {
            const DialogComponent = item.dialog;
            if (!isDataLoaded || !navData) {
                return (
                    <Button variant="secondary" className="h-auto w-full p-0" disabled>
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </Button>
                )
            }
            return (
                <DialogComponent 
                    onVoucherAdded={() => {}} 
                    onClientAdded={() => {}} 
                    onBookingAdded={() => {}} 
                    onSubscriptionAdded={() => {}}
                    clients={navData.clients}
                    suppliers={navData.suppliers}
                >
                    {cardComponent}
                </DialogComponent>
            );
        }

        if (item.href) {
            return <Link href={item.href} className="block h-full">{cardComponent}</Link>;
        }

        return <div className="h-full">{cardComponent}</div>;
    }


    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {renderCard()}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{item.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

interface DashboardGridProps {
  sections: DashboardSection[];
  isEditing: boolean;
  onLayoutChange: (sections: DashboardSection[]) => void;
}

export default function DashboardGrid({ sections, isEditing, onLayoutChange }: DashboardGridProps) {

    const handleToggleVisibility = (sectionId: string, itemId: string) => {
        const newSections = sections.map(section => {
            if (section.id === sectionId) {
                return {
                    ...section,
                    items: section.items.map(item => {
                        if (item.id === itemId) {
                            return { ...item, isVisible: !item.isVisible };
                        }
                        return item;
                    })
                };
            }
            return section;
        });
        onLayoutChange(newSections);
    };


    return (
        <div className="space-y-8">
            {sections.map(section => (
                 <Card key={section.id} className="bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {section.icon && <section.icon className="h-6 w-6 text-muted-foreground" />}
                           {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                           {section.items.filter(item => isEditing || item.isVisible).map(item => (
                               <ShortcutCard 
                                   key={item.id} 
                                   item={item} 
                                   isEditing={isEditing}
                                   onToggleVisibility={() => handleToggleVisibility(section.id, item.id)}
                               />
                           ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

