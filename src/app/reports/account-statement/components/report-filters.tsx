
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, CheckCheck, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
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
        <div className="space-y-4">
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="outline" className="w-full justify-between">
                            فلترة الحركات
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                         <DropdownMenuItem onSelect={handleSelectAll}><CheckCheck className="ms-2 h-4 w-4"/> تحديد الكل</DropdownMenuItem>
                         <DropdownMenuItem onSelect={handleDeselectAll}><Undo className="ms-2 h-4 w-4"/>إلغاء تحديد الكل</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {allFilters.map((type) => {
                             const Icon = type.icon;
                             return (
                                <DropdownMenuCheckboxItem
                                    key={type.id}
                                    checked={filters.typeFilter.has(type.id)}
                                    onCheckedChange={() => handleFilterToggle(type.id)}
                                    className="justify-between"
                                >
                                    <span>{type.label}</span>
                                    <Icon className="h-4 w-4 text-muted-foreground"/>
                                </DropdownMenuCheckboxItem>
                             )
                         })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
