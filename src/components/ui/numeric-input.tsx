
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
    const [localValue, setLocalValue] = React.useState<string>(() => {
      const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
      return (numValue === undefined || numValue === null || isNaN(numValue)) ? '' : String(numValue);
    });

    React.useEffect(() => {
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
        const newValueStr = (numValue === undefined || numValue === null || isNaN(numValue)) ? '' : String(numValue);
        if (newValueStr !== localValue) {
             setLocalValue(newValueStr);
        }
    }, [value]);
    
    const displayValue = React.useMemo(() => {
      if (isFocused) return localValue;
      const numValue = parseFloat(localValue);
      if (isNaN(numValue) || numValue === 0) return '';
      return new Intl.NumberFormat('en-US').format(numValue);
    }, [localValue, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      const regex = allowNegative ? /[^0-9.-]/g : /[^0-9.]/g;
      let numericValStr = inputValue.replace(regex, "");

      const parts = numericValStr.split('.');
      if (parts.length > 2) {
        numericValStr = `${''}${parts[0]}.${parts.slice(1).join('')}`;
      }
      
      if (allowNegative && numericValStr.lastIndexOf('-') > 0) {
        numericValStr = `-${numericValStr.replace(/-/g, '')}`;
      }
      
      setLocalValue(numericValStr);

      if (onValueChange) {
        if (numericValStr === '' || numericValStr === '-') {
             onValueChange(undefined);
        } else {
            const parsed = parseFloat(numericValStr);
            onValueChange(isNaN(parsed) ? undefined : parsed);
        }
      }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        props.onBlur?.(e);
    }
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
         setIsFocused(true);
         props.onFocus?.(e);
    }

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

  