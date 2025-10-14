
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
    
    // Internal state to hold the raw string value for editing
    const [internalString, setInternalString] = React.useState<string>(
      value === undefined || value === null ? '' : String(value)
    );

    // Sync with external value prop when it changes from outside
    React.useEffect(() => {
        const stringValue = value === undefined || value === null || value === '' ? '' : String(value);
        const internalNum = parseFloat(internalString);
        const valueNum = parseFloat(stringValue);

        // Only update if the numeric values are different, to avoid interrupting user input
        if (isNaN(internalNum) && isNaN(valueNum) && internalString === stringValue) return;
        if (internalNum !== valueNum) {
           setInternalString(stringValue);
        }
    }, [value]);


    const formatValue = (numStr: string | undefined | null): string => {
        if (numStr === undefined || numStr === null || numStr === '') return '';
        const numberValue = parseFloat(numStr);
        if (isNaN(numberValue)) return numStr; // Return as is if not a valid number (e.g., "50.")
        
        // Use formatting that handles decimals correctly
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 20,
        }).format(numberValue);
    };
    
    const parseValue = (str: string): number | undefined => {
        if (str === '') return undefined;
        const cleaned = str.replace(/,/g, '');
        const numberValue = parseFloat(cleaned);
        return isNaN(numberValue) ? undefined : numberValue;
    };
    

    const displayValue = isFocused ? internalString : formatValue(internalString);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Regex to allow numbers, a single decimal point, and a negative sign at the start
      const regex = allowNegative ? /^-?[0-9]*\.?[0-9]*$/ : /^[0-9]*\.?[0-9]*$/;
      
      if (regex.test(inputValue)) {
          setInternalString(inputValue);
          if (onValueChange) {
              const parsed = parseValue(inputValue);
              // Only call onValueChange if it's a valid number or empty
              if (parsed !== undefined || inputValue === '' || inputValue === '-') {
                onValueChange(parsed);
              }
          }
      }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const parsed = parseValue(internalString);
        if (onValueChange) {
            onValueChange(parsed);
        }
        // Format the display on blur
        setInternalString(String(parsed || ''));
        props.onBlur?.(e);
    }
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
         setIsFocused(true);
         // When focusing, set the internal state to be the non-formatted number string
         const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
         setInternalString(numValue === undefined || numValue === null || isNaN(numValue) ? '' : String(numValue));
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
