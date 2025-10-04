
"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as React from "react";

interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: "hours" | "minutes" | "seconds";
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

export const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(
  (
    { className, type = "number", picker, date, setDate, onRightFocus, onLeftFocus, ...props },
    ref
  ) => {

    const getArrowByType = (
      e: React.KeyboardEvent<HTMLInputElement>,
      type: "ArrowRight" | "ArrowLeft"
    ) => {
      if (type === "ArrowRight") {
        onRightFocus?.();
      }
      if (type === "ArrowLeft") {
        onLeftFocus?.();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowRight") {
        getArrowByType(e, "ArrowRight");
      }
      if (e.key === "ArrowLeft") {
        getArrowByType(e, "ArrowLeft");
      }
    };
    
    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const newDate = date ? new Date(date) : new Date();
        const numValue = parseInt(value, 10);
        if(isNaN(numValue)) return;
        
        if (picker === 'hours') {
             const isPM = newDate.getHours() >= 12;
             let hours = numValue;
             if (isPM && hours !== 12) hours += 12;
             if (!isPM && hours === 12) hours = 0;
             newDate.setHours(hours);
        } else if (picker === 'minutes') {
            newDate.setMinutes(numValue);
        }
        setDate(newDate);
    }
    
    const displayValue = React.useMemo(() => {
        if (!date) return "00";
        if (picker === 'hours') {
            const hours = date.getHours() % 12;
            return hours === 0 ? "12" : String(hours).padStart(2, '0');
        }
        return String(date.getMinutes()).padStart(2, '0');
    }, [date, picker]);

    return (
      <Input
        ref={ref}
        id={picker}
        dir="ltr"
        type={type}
        className={cn(
          "w-12 h-10 text-center font-mono text-base",
          className
        )}
        value={displayValue}
        onChange={handleValueChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = "TimePickerInput";
