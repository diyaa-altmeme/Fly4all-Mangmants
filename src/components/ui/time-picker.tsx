
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export function TimePicker({ date, setDate }: TimePickerProps) {
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    if (!timeValue || !date) return;

    const [hours, minutes] = timeValue.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setDate(newDate);
  };
  
  const timeValue = date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : "";

  return (
    <Input
      type="time"
      value={timeValue}
      onChange={handleTimeChange}
      className="text-center"
    />
  );
}
