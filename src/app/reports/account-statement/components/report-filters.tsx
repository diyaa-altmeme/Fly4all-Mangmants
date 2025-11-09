
"use client";

import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";
import { isEqual } from "lodash";
import { useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Autocomplete } from "@/components/ui/autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from 'date-fns';

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

function DatePicker({ date, setDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "yyyy-MM-dd")
          ) : (
            <span>اختر تاريخ</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const accountTypes = [
    { value: 'relation', label: 'حساب عميل/مورد' },
    { value: 'box', label: 'الصندوق' },
    { value: 'exchange', label: 'الصرافة' },
    { value: 'static', label: 'حساب عام' },
    { value: 'expense', label: 'مصروف' },
];

const relationKinds = [
    { value: 'client', label: 'عميل' },
    { value: 'supplier', label: 'مورد' },
    { value: 'partner', label: 'شريك' },
    { value: 'other', label: 'أخرى' },
];

interface ReportFiltersProps {
    accounts: { value: string; label: string; }[];
    vouchers: { id: string; label: string, group: string, icon: React.ElementType }[];
    officers: string[];
    currencies: { code: string; label: string; symbol?: string }[];
    filters: any;
    onFiltersChange: (filters: any) => void;
}

export default function ReportFilters({ accounts, vouchers, officers, currencies, filters, onFiltersChange }: ReportFiltersProps) {
    const { watch, setValue, register, getValues } = useFormContext();

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    const onChange = (newValues: any) => {
      onFiltersChange({ ...filters, ...newValues });
    };

    useEffect(() => {
        const currentFilters = getValues();
        if(!isEqual(filters, currentFilters)) {
            onChange(currentFilters);
        }
    }, [watch, filters, getValues, onChange]);


    const toggleVoucherType = (value: string) => {
        const currentSet = new Set<string>(filters.typeFilter);
        if (currentSet.has(value)) {
            currentSet.delete(value);
        } else {
            currentSet.add(value);
        }
        onChange({ ...filters, typeFilter: currentSet });
    };

    const handleSelectAll = (group: string) => {
        const groupFilters = vouchers.filter(v => v.group === group).map(v => v.id);
        const currentSet = new Set(filters.typeFilter);
        const areAllSelected = groupFilters.every(f => currentSet.has(f));
        
        if (areAllSelected) {
            groupFilters.forEach(f => currentSet.delete(f));
        } else {
            groupFilters.forEach(f => currentSet.add(f));
        }
        onChange({ ...filters, typeFilter: currentSet });
    }

    const accountType = watch('accountType');

    const basicFilters = vouchers.filter(v => v.group === 'basic');
    const otherFilters = vouchers.filter(v => v.group === 'other');

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="font-semibold">الحساب</Label>
                 <Autocomplete 
                    options={accounts} 
                    value={filters.accountId} 
                    onValueChange={(v) => onChange({ accountId: v })}
                    placeholder="ابحث عن حساب..."
                />
            </div>
            
             <div className="space-y-2">
                <Label className="font-semibold">نوع الحساب</Label>
                <Select onValueChange={(v) => onChange({ accountType: v })} value={accountType}>
                    <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                        {accountTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label className="font-semibold">الفترة الزمنية</Label>
                 <div className="grid grid-cols-2 gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("justify-start text-left font-normal h-9", !filters.dateRange?.from && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateRange?.from ? format(filters.dateRange.from, "yyyy-MM-dd") : <span>من تاريخ</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={filters.dateRange?.from} onSelect={(d) => onChange({ dateRange: { ...filters.dateRange, from: d } })} initialFocus />
                        </PopoverContent>
                    </Popover>
                     <Popover>
                        <PopoverTrigger asChild>
                             <Button variant="outline" className={cn("justify-start text-left font-normal h-9", !filters.dateRange?.to && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateRange?.to ? format(filters.dateRange.to, "yyyy-MM-dd") : <span>إلى تاريخ</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={filters.dateRange?.to} onSelect={(d) => onChange({ dateRange: { ...filters.dateRange, to: d } })} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="font-semibold">نوع الحركة</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-9">
                            {filters.typeFilter.size > 0 
                                ? `${filters.typeFilter.size} نوع محدد`
                                : 'اختر نوع الحركة'
                            }
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0">
                        <Command>
                            <CommandList>
                                <CommandGroup heading="الحركات الأساسية">
                                    <CommandItem onSelect={() => handleSelectAll('basic')} className="font-bold cursor-pointer">تحديد/إلغاء الكل</CommandItem>
                                    {basicFilters.map((voucher) => (
                                         <React.Fragment key={voucher.id}>
                                            <CommandItem onSelect={() => toggleVoucherType(voucher.id)}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                        <voucher.icon className="h-4 w-4"/>
                                                        {voucher.label}
                                                    </div>
                                                    <Checkbox
                                                        checked={filters.typeFilter.has(voucher.id)}
                                                        className="ml-2.5"
                                                    />
                                                </div>
                                            </CommandItem>
                                        </React.Fragment>
                                    ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup heading="الحركات الأخرى">
                                     <CommandItem onSelect={() => handleSelectAll('other')} className="font-bold cursor-pointer">تحديد/إلغاء الكل</CommandItem>
                                    {otherFilters.map((voucher) => (
                                         <React.Fragment key={voucher.id}>
                                            <CommandItem onSelect={() => toggleVoucherType(voucher.id)}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                         <voucher.icon className="h-4 w-4"/>
                                                         {voucher.label}
                                                    </div>
                                                    <Checkbox
                                                        checked={filters.typeFilter.has(voucher.id)}
                                                        className="ml-2.5"
                                                    />
                                                </div>
                                            </CommandItem>
                                        </React.Fragment>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            
             <div className="space-y-2">
                <Label className="font-semibold">خيارات إضافية</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Select value={filters.currency} onValueChange={(v) => onChange({currency: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="both">كل العملات</SelectItem>
                            {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filters.direction} onValueChange={(v) => onChange({direction: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الحركات</SelectItem>
                            <SelectItem value="debit">مدينة (Debits)</SelectItem>
                            <SelectItem value="credit">دائنة (Credits)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <Select value={filters.officer} onValueChange={(v) => onChange({officer: v})}>
                    <SelectTrigger><SelectValue placeholder="كل الموظفين"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الموظفين</SelectItem>
                        {officers.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-2">
                    <Input placeholder="أدنى مبلغ" value={filters.minAmount} onChange={e => onChange({minAmount: e.target.value})} type="number" />
                    <Input placeholder="أقصى مبلغ" value={filters.maxAmount} onChange={e => onChange({maxAmount: e.target.value})} type="number" />
                </div>
                 <div className="flex items-center space-x-2 space-x-reverse pt-2">
                    <Checkbox id="show-opening-balance" checked={filters.showOpeningBalance} onCheckedChange={(c) => onChange({ showOpeningBalance: !!c })} />
                    <Label htmlFor="show-opening-balance" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                        إظهار الرصيد الافتتاحي
                    </Label>
                </div>
            </div>
        </div>
    );
}
    