
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, CheckCheck, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import type { Currency } from '@/lib/types';


interface ReportFiltersProps {
    allFilters: { id: string, label: string, icon: React.ElementType }[];
    filters: {
        currency: Currency | 'both';
        reportType: 'summary' | 'detailed';
        typeFilter: Set<string>;
    };
    onFiltersChange: (filters: any) => void;
}

export default function ReportFilters({ allFilters, filters, onFiltersChange }: ReportFiltersProps) {

    const handleFilterToggle = (id: string) => {
        onFiltersChange((prev: any) => {
            const newSet = new Set(prev.typeFilter);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return { ...prev, typeFilter: newSet };
        });
    };

    const handleSelectAll = () => onFiltersChange((prev: any) => ({ ...prev, typeFilter: new Set(allFilters.map(f => f.id)) }));
    const handleDeselectAll = () => onFiltersChange((prev: any) => ({ ...prev, typeFilter: new Set() }));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="font-semibold">خيارات العرض</Label>
                <div className="flex flex-col gap-2">
                    <Select value={filters.currency} onValueChange={(v) => onFiltersChange((prev: any) => ({...prev, currency: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">كل العملات</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="IQD">IQD</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.reportType} onValueChange={(v) => onFiltersChange((prev: any) => ({...prev, reportType: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="summary">موجز</SelectItem>
                            <SelectItem value="detailed">مفصل</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="font-semibold">فلترة الحركات</Label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><SlidersHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleSelectAll}><CheckCheck className="me-2 h-4 w-4"/> تحديد الكل</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDeselectAll}><Undo className="me-2 h-4 w-4"/>إلغاء تحديد الكل</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {allFilters.map((type) => {
                        const Icon = type.icon;
                        return (
                            <div key={type.id} className="flex items-center space-x-2 space-x-reverse rounded-md border p-2 bg-background">
                                <Checkbox
                                    id={type.id}
                                    checked={filters.typeFilter.has(type.id)}
                                    onCheckedChange={() => handleFilterToggle(type.id)}
                                />
                                <Label htmlFor={type.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                                    <Icon className="h-3 w-3 text-muted-foreground"/> {type.label}
                                </Label>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}


    