
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/types";

// A robust function to parse different decimal and thousands formats
const parseNumericValue = (value: string | number | null | undefined): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const stringValue = String(value).replace(/,/g, '');
    const num = parseFloat(stringValue);
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
    
    const formatValue = (num: number | string | null | undefined): string => {
        const numericVal = parseNumericValue(num);
        if (numericVal === undefined) return '';
        const options: Intl.NumberFormatOptions = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 20, // Allow more precision for internal state
        };
        return new Intl.NumberFormat('en-US', options).format(numericVal);
    };
    
    const [displayValue, setDisplayValue] = React.useState<string>(formatValue(value));

    // When the external value prop changes, update the internal state
    React.useEffect(() => {
        const numericVal = parseNumericValue(value);
        const currentDisplayNumericVal = parseNumericValue(displayValue);
        
        if (numericVal !== currentDisplayNumericVal) {
            setDisplayValue(formatValue(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Allow only numbers, one decimal point, and optionally a negative sign
      const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
      const sanitized = rawValue.replace(/,/g, '');

      if (regex.test(sanitized) || sanitized === '') {
        setDisplayValue(sanitized); // Show sanitized value directly to allow typing decimals
        if (onValueChange) {
            onValueChange(parseNumericValue(sanitized));
        }
      }
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numericVal = parseNumericValue(e.target.value);
        setDisplayValue(formatValue(numericVal));
        if (onValueChange) {
            onValueChange(numericVal); // Ensure parent form state has the clean number
        }
        if (props.onBlur) {
            props.onBlur(e);
        }
    };
    
    const inputProps = {
        ...props,
        ref,
        type: "text" as const,
        inputMode: "decimal" as const,
        value: displayValue,
        onChange: handleChange,
        onBlur: handleBlur,
    };
    
    if (currency) {
      return (
        <div className={cn("relative flex items-center w-full", className)}>
          <Input
            {...inputProps}
            className={cn(
              "z-10 text-right w-full",
              direction === 'rtl' ? "rounded-l-none rounded-r-lg border-l-0" : "rounded-r-none rounded-l-lg border-r-0"
            )}
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
        {...inputProps}
        className={cn("text-right", className)}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };

