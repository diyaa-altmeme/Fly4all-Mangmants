
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ImportSectionSelector({
  sections,
  selected,
  onChange,
}: {
  sections: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const handleCheckedChange = (checked: boolean, section: string) => {
    onChange(
      checked
        ? [...selected, section]
        : selected.filter((s) => s !== section)
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {sections.map((section) => (
        <div key={section} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <Checkbox
            id={`section-${section}`}
            checked={selected.includes(section)}
            onCheckedChange={(checked) => handleCheckedChange(Boolean(checked), section)}
          />
          <Label htmlFor={`section-${section}`} className="font-semibold capitalize cursor-pointer">
            {section}
          </Label>
        </div>
      ))}
    </div>
  );
}
