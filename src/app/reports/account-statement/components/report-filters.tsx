
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, CheckCheck, Undo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import type { Currency } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface ReportFiltersProps {
    allFilters: { id: string, label: string, icon: React.ElementType, group: 'basic' | 'other' }[];
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

    const basicOperations = allFilters.filter(f => f.group === 'basic');
    const otherOperations = allFilters.filter(f => f.group === 'other');

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
            
            <Accordion type="multiple" defaultValue={['basic_ops', 'other_ops']} className="w-full">
                <div className="flex justify-between items-center mb-2 px-1">
                     <Label className="font-semibold">فلترة الحركات</Label>
                     <div className="flex items-center gap-2">
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleSelectAll}>تحديد الكل</Button>
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive" onClick={handleDeselectAll}>إلغاء الكل</Button>
                     </div>
                </div>

                <AccordionItem value="basic_ops" className="border-t">
                    <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">عمليات أساسية</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-2">
                        {basicOperations.map(type => {
                            const Icon = type.icon;
                            return (
                                <div key={type.id} className="flex items-center space-x-2 space-x-reverse">
                                    <Checkbox id={`filter-${type.id}`} checked={filters.typeFilter.has(type.id)} onCheckedChange={() => handleFilterToggle(type.id)} />
                                    <Label htmlFor={`filter-${type.id}`} className="flex items-center gap-2 cursor-pointer text-xs">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        {type.label}
                                    </Label>
                                </div>
                            )
                        })}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="other_ops" className="border-t">
                    <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">عمليات أخرى</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-2">
                         {otherOperations.map(type => {
                            const Icon = type.icon;
                            return (
                                <div key={type.id} className="flex items-center space-x-2 space-x-reverse">
                                    <Checkbox id={`filter-${type.id}`} checked={filters.typeFilter.has(type.id)} onCheckedChange={() => handleFilterToggle(type.id)} />
                                    <Label htmlFor={`filter-${type.id}`} className="flex items-center gap-2 cursor-pointer text-xs">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        {type.label}
                                    </Label>
                                </div>
                            )
                        })}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
