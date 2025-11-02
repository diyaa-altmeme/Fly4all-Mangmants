
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Currency } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface ReportFiltersProps {
    allFilters: { id: string, label: string, icon: React.ElementType, group: 'basic' | 'other' }[];
    filters: {
        currency: Currency | 'both';
        typeFilter: Set<string>;
        direction: 'all' | 'debit' | 'credit';
        officer: string;
        minAmount: string;
        maxAmount: string;
    };
    officerOptions: string[];
    onFiltersChange: (filters: any) => void;
    onResetFilters: () => void;
    currencyOptions?: { code: string; label: string; symbol?: string }[];
}

export default function ReportFilters({ allFilters, filters, onFiltersChange, officerOptions, onResetFilters, currencyOptions }: ReportFiltersProps) {

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

    const availableCurrencies = currencyOptions && currencyOptions.length > 0
        ? currencyOptions
        : [
            { code: 'USD', label: 'الدولار الأمريكي' },
            { code: 'IQD', label: 'الدينار العراقي' },
        ];

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Label className="font-semibold">خيارات العرض</Label>
                <div className="flex flex-col gap-2">
                    <Select value={filters.currency} onValueChange={(v) => onFiltersChange((prev: any) => ({...prev, currency: v}))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="كل العملات" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">كل العملات</SelectItem>
                            {availableCurrencies.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                    {currency.label} ({currency.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.direction} onValueChange={(v) => onFiltersChange((prev: any) => ({ ...prev, direction: v }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="كل الحركات" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الحركات</SelectItem>
                            <SelectItem value="debit">حركات مدينة فقط</SelectItem>
                            <SelectItem value="credit">حركات دائنة فقط</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.officer} onValueChange={(v) => onFiltersChange((prev: any) => ({ ...prev, officer: v }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الموظفين</SelectItem>
                            {officerOptions.map((officer) => (
                                <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="number"
                            placeholder="حد أدنى"
                            value={filters.minAmount}
                            onChange={(e) => onFiltersChange((prev: any) => ({ ...prev, minAmount: e.target.value }))}
                            className="h-10"
                        />
                        <Input
                            type="number"
                            placeholder="حد أقصى"
                            value={filters.maxAmount}
                            onChange={(e) => onFiltersChange((prev: any) => ({ ...prev, maxAmount: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <Button variant="ghost" size="sm" onClick={onResetFilters}>
                        إعادة تعيين الفلاتر المتقدمة
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                     <Label className="font-semibold">فلترة الحركات</Label>
                     <div className="flex items-center gap-2">
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleSelectAll}>تحديد الكل</Button>
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive" onClick={handleDeselectAll}>إلغاء الكل</Button>
                     </div>
                </div>
                <Tabs defaultValue="basic_ops" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic_ops">عمليات أساسية</TabsTrigger>
                        <TabsTrigger value="other_ops">عمليات أخرى</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic_ops" className="mt-4">
                        <div className="grid grid-cols-2 gap-3">
                            {basicOperations.map(type => {
                                const Icon = type.icon;
                                return (
                                    <div key={type.id} className="flex items-center space-x-2 space-x-reverse p-2 rounded-md bg-muted/40">
                                        <Checkbox id={`filter-${type.id}`} checked={filters.typeFilter.has(type.id)} onCheckedChange={() => handleFilterToggle(type.id)} />
                                        <Label htmlFor={`filter-${type.id}`} className="flex items-center gap-2 cursor-pointer text-xs">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            {type.label}
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    </TabsContent>
                    <TabsContent value="other_ops" className="mt-4">
                         <div className="grid grid-cols-2 gap-3">
                            {otherOperations.map(type => {
                                const Icon = type.icon;
                                return (
                                    <div key={type.id} className="flex items-center space-x-2 space-x-reverse p-2 rounded-md bg-muted/40">
                                        <Checkbox id={`filter-${type.id}`} checked={filters.typeFilter.has(type.id)} onCheckedChange={() => handleFilterToggle(type.id)} />
                                        <Label htmlFor={`filter-${type.id}`} className="flex items-center gap-2 cursor-pointer text-xs">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            {type.label}
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
