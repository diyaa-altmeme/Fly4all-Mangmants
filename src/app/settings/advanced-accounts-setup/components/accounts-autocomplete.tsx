"use client";

import React from 'react';

export default function AccountsAutocomplete({ value, onChange, options = [] }: { value?: string | null; onChange?: (v: string | null) => void; options?: any[] }) {
  return (
    <select value={value ?? ''} onChange={e => onChange?.(e.target.value || null)}>
      <option value="">-- اختر حساب --</option>
      {options.map((o: any) => (
        <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
      ))}
    </select>
  );
}
