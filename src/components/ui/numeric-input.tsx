
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/types";

// A robust function to parse different decimal and thousands formats
const parseNumericValue = (value: string): number | undefined => {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    // Standardize decimal separator to a period and remove thousands separators
    const sanitized = value
        .replace(/,/g, '.')
        .replace(/\s/g, '')
        .replace(/(?<=\..*)\./g, ''); // Remove all but first decimal point

    const num = parseFloat(sanitized);
    return isNaN(num) ? undefined : num;
};


interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value?: number | string | null;
  onValueChange?: (value: number | undefined) => void;
  allowNegative?: boolean;
  currency?: Currency;
  currencyClassName?: string;
  direction?: 'ltr' | 'rtl';
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onValueChange, className, allowNegative = false, currency, currencyClassName, direction = 'rtl', ...props }, ref) => {
    
    const [internalValue, setInternalValue] = React.useState<string>(String(value ?? ''));

    // When the external value prop changes, update the internal state
    React.useEffect(() => {
        setInternalValue(String(value ?? ''));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow user to type freely, including decimals and negative signs
      setInternalValue(val);

      if (onValueChange) {
        const numericVal = parseNumericValue(val);
        onValueChange(numericVal);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const numericVal = parseNumericValue(internalValue);
      if (numericVal !== undefined) {
        // On blur, format the internal value for display, but keep the raw number for the form state
        setInternalValue(String(numericVal));
      } else {
        setInternalValue('');
      }
      props.onBlur?.(e);
    };

    const displayValue = () => {
       const numericVal = parseNumericValue(internalValue);
       if (numericVal !== undefined) {
         return new Intl.NumberFormat('en-US', {
           minimumFractionDigits: 0,
           maximumFractionDigits: 4, // Allow up to 4 decimal places for precision
         }).format(numericVal);
       }
       return internalValue; // Show raw input while typing or if invalid
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
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
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
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
