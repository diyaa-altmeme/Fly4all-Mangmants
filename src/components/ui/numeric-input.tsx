"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | string;
  onValueChange?: (value: number | undefined) => void;
  allowNegative?: boolean;
  currency?: Currency;
  currencyClassName?: string;
  direction?: 'ltr' | 'rtl';
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onValueChange, className, allowNegative = false, currency, currencyClassName, direction = 'rtl', ...props }, ref) => {
    
    const [isFocused, setIsFocused] = React.useState(false);
    const [internalString, setInternalString] = React.useState<string>("");

    // Helper to format number string with thousand separators
    const formatValue = (val: string | number | undefined | null): string => {
        if (val === undefined || val === null || val === '') return '';
        const num = Number(val);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(num);
    };
    
    // When the external value changes, update the internal state
    React.useEffect(() => {
        const formatted = String(value ?? '');
        setInternalString(formatted);
    }, [value]);


    const parseAndSanitize = (val: string): string => {
        // Allow only numbers, one decimal point, and optionally a negative sign
        let sanitized = val.replace(/[^0-9.-]/g, '');
        
        // Ensure only one decimal point
        const parts = sanitized.split('.');
        if (parts.length > 2) {
            sanitized = parts[0] + '.' + parts.slice(1).join('');
        }

        // Handle negative sign
        if (!allowNegative) {
            sanitized = sanitized.replace(/-/g, '');
        } else if (sanitized.lastIndexOf('-') > 0) {
            sanitized = `-${sanitized.replace(/-/g, '')}`;
        }
        
        return sanitized;
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = parseAndSanitize(e.target.value);
        setInternalString(sanitized);

        if (onValueChange) {
            const numValue = parseFloat(sanitized);
            if (!isNaN(numValue)) {
                onValueChange(numValue);
            } else if (sanitized === '' || (sanitized === '-' && allowNegative)) {
                onValueChange(undefined);
            }
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const numValue = parseFloat(internalString);
        if (!isNaN(numValue)) {
            // No need to set internal string to formatted value, let displayValue handle it.
            if(onValueChange) onValueChange(numValue);
        } else {
            if(onValueChange) onValueChange(undefined);
            setInternalString(""); // Clear if not a valid number
        }
        props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        // When focusing, the internal string is already the raw, unformatted value.
        props.onFocus?.(e);
    };
    
    // Determine what to display: raw input while focused, formatted value otherwise.
    const displayValue = isFocused ? internalString : formatValue(internalString);

    if (currency) {
      return (
        <div className={cn("relative flex items-center w-full", className)}>
          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className={cn(
              "z-10 text-right w-full",
              direction === 'rtl' ? "rounded-l-none rounded-r-lg border-l-0" : "rounded-r-none rounded-l-lg border-r-0"
            )}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            {...props}
          />
           <div className={cn(
            "p-2 bg-muted border h-full flex items-center",
            currencyClassName,
            direction === 'rtl' ? "rounded-l-lg" : "rounded-r-lg"
          )}>
                <span className="text-xs font-semibold">{currency}</span>
            </div>
        </div>
      );
    }
    
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        className={cn("text-right", className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
