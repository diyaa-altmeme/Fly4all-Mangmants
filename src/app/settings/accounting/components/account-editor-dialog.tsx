"use client";

import React, { useState } from 'react';

export default function AccountEditorDialog({ parentId, onSaved }: { parentId?: string | null; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('asset');

  async function handleSave() {
    // TODO: call server action createAccount
    // Placeholder optimistic behavior
    setOpen(false);
    onSaved?.();
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}>إنشاء حساب</button>
      {open && (
        <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 8 }}>
          <h3>إنشاء/تعديل حساب</h3>
          <label>الاسم</label>
          <input value={name} onChange={e => setName(e.target.value)} />
          <label>النوع</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="asset">الأصول</option>
            <option value="liability">الالتزامات</option>
            <option value="equity">حقوق الملكية</option>
            <option value="revenue">الإيرادات</option>
            <option value="expense">المصروفات</option>
          </select>
          <div style={{ marginTop: 8 }}>
            <button onClick={handleSave}>حفظ</button>
            <button onClick={() => setOpen(false)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
