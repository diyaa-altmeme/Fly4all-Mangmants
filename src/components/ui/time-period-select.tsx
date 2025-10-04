
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export type Period = "AM" | "PM";

interface TimePeriodSelectProps {
  period: Period;
  setPeriod: (period: Period) => void;
  onLeftFocus?: () => void;
}

export const TimePeriod = React.forwardRef<
  HTMLButtonElement,
  TimePeriodSelectProps
>(({ period, setPeriod, onLeftFocus }, ref) => {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onLeftFocus?.();
    }
  };
  
  return (
    <div className="flex h-10 items-center">
      <Button
        variant="outline"
        size="sm"
        className="h-full rounded-none rounded-s-md"
        onClick={() => setPeriod("AM")}
        data-active={period === "AM"}
      >
        AM
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-full rounded-none rounded-e-md"
        ref={ref}
        onClick={() => setPeriod("PM")}
        data-active={period === "PM"}
        onKeyDown={handleKeyDown}
      >
        PM
      </Button>
    </div>
  );
});

TimePeriod.displayName = "TimePeriod";
