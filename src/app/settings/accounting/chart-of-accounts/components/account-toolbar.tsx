
"use client";

import React from 'react';

export default function AccountToolbar({ onCreate }: { onCreate?: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button onClick={() => onCreate?.()}>إنشاء حساب</button>
      <button>تصدير CSV</button>
      <div style={{ marginLeft: 'auto' }}>
        <label>فلتر النوع</label>
      </div>
    </div>
  );
}
