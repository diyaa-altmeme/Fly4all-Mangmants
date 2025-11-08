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
            "w-[280px] justify-start text-left font-normal",
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
    { value: 'static', label: 'حساب ثابت' },
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
    vouchers: { value: string; label: string; }[];
    onChange: (filters: any) => void;
}

export default function ReportFilters({ accounts, vouchers, onChange }: ReportFiltersProps) {
    const { watch, setValue } = useFormContext<any>();

    const accountId = watch('accountId') || '';
    const accountType = watch('accountType');
    const relationKind = watch('relationKind');
    const voucherType = watch('voucherType') || [];
    const dateFrom = watch('dateFrom');
    const dateTo = watch('dateTo');
    const includeDeleted = watch('includeDeleted');
    const showOpeningBalance = watch('showOpeningBalance');

    const [localAccountId, setLocalAccountId] = React.useState(accountId);
    const [localAccountType, setLocalAccountType] = React.useState(accountType);
    const [localRelationKind, setLocalRelationKind] = React.useState(relationKind);
    const [localVoucherType, setLocalVoucherType] = React.useState<string[]>(voucherType);
    const [localDateFrom, setLocalDateFrom] = React.useState(dateFrom);
    const [localDateTo, setLocalDateTo] = React.useState(dateTo);
    const [localIncludeDeleted, setLocalIncludeDeleted] = React.useState(includeDeleted);
    const [localShowOpeningBalance, setLocalShowOpeningBalance] = React.useState(showOpeningBalance);
    
    const debouncedAccountId = useDebounce(localAccountId, 300);
    const debouncedAccountType = useDebounce(localAccountType, 300);
    const debouncedRelationKind = useDebounce(localRelationKind, 300);
    const debouncedVoucherType = useDebounce(localVoucherType, 300);
    const debouncedDateFrom = useDebounce(localDateFrom, 300);
    const debouncedDateTo = useDebounce(localDateTo, 300);
    const debouncedIncludeDeleted = useDebounce(localIncludeDeleted, 300);
    const debouncedShowOpeningBalance = useDebounce(localShowOpeningBalance, 300);

    useEffect(() => {
        setValue('accountId', debouncedAccountId, { shouldValidate: true });
        setValue('accountType', debouncedAccountType, { shouldValidate: true });
        setValue('relationKind', debouncedRelationKind, { shouldValidate: true });
        setValue('voucherType', debouncedVoucherType, { shouldValidate: true });
        setValue('dateFrom', debouncedDateFrom, { shouldValidate: true });
        setValue('dateTo', debouncedDateTo, { shouldValidate: true });
        setValue('includeDeleted', debouncedIncludeDeleted, { shouldValidate: true });
        setValue('showOpeningBalance', debouncedShowOpeningBalance, { shouldValidate: true });
    }, [debouncedAccountId, debouncedAccountType, debouncedRelationKind, debouncedVoucherType, debouncedDateFrom, debouncedDateTo, debouncedIncludeDeleted, debouncedShowOpeningBalance, setValue]);

    useEffect(() => {
        const filters = {
            accountId: debouncedAccountId,
            accountType: debouncedAccountType,
            relationKind: debouncedRelationKind,
            voucherType: debouncedVoucherType,
            dateFrom: debouncedDateFrom,
            dateTo: debouncedDateTo,
            includeDeleted: debouncedIncludeDeleted,
            showOpeningBalance: debouncedShowOpeningBalance,
        };
        onChange(filters);
    }, [debouncedAccountId, debouncedAccountType, debouncedRelationKind, debouncedVoucherType, debouncedDateFrom, debouncedDateTo, debouncedIncludeDeleted, debouncedShowOpeningBalance, onChange]);


    const toggleVoucherType = (value: string) => {
        setLocalVoucherType((prev) => {
            const isSelected = prev.includes(value);
            return isSelected ? prev.filter((v) => v !== value) : [...prev, value];
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>الحساب</Label>
                <Autocomplete options={accounts} value={localAccountId} onValueChange={setLocalAccountId} placeholder="ابحث عن حساب..." />
            </div>
            
             <div className="space-y-2">
                <Label>نوع الحساب</Label>
                <Select onValueChange={setLocalAccountType} value={localAccountType}>
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

            {localAccountType === 'relation' && (
                <div className="space-y-2">
                    <Label>نوع العلاقة</Label>
                    <Select onValueChange={setLocalRelationKind} value={localRelationKind}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر نوع العلاقة" />
                        </SelectTrigger>
                        <SelectContent>
                            {relationKinds.map((kind) => (
                                <SelectItem key={kind.value} value={kind.value}>
                                    {kind.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label>نوع السند</Label>
                <Command>
                    <CommandInput placeholder="ابحث عن نوع السند..." />
                    <CommandList className="max-h-56">
                        <CommandEmpty>لا يوجد أنواع سندات.</CommandEmpty>
                        <CommandGroup heading="أنواع السندات">
                            {vouchers.map((voucher) => (
                                <CommandItem key={voucher.value} onSelect={() => toggleVoucherType(voucher.value)}>
                                    <div className="flex items-center justify-between">
                                        {voucher.label}
                                        <Checkbox
                                            checked={localVoucherType.includes(voucher.value)}
                                            className="ml-2.5"
                                            onCheckedChange={() => toggleVoucherType(voucher.value)}
                                        />
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </div>

            <div className="space-y-2">
                <Label>من تاريخ</Label>
                <DatePicker date={localDateFrom} setDate={setLocalDateFrom} />
            </div>

            <div className="space-y-2">
                <Label>إلى تاريخ</Label>
                <DatePicker date={localDateTo} setDate={setLocalDateTo} />
            </div>
            
            <div className="flex items-center space-x-2">
                <Checkbox id="include-deleted" checked={localIncludeDeleted} onCheckedChange={setLocalIncludeDeleted} />
                <label htmlFor="include-deleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    تضمين المحذوفات
                </label>
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox id="show-opening-balance" checked={localShowOpeningBalance} onCheckedChange={setLocalShowOpeningBalance} />
                <label htmlFor="show-opening-balance" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    إظهار الرصيد الافتتاحي
                </label>
            </div>
        </div>
    );
}
