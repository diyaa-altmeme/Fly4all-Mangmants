"use client";

import React, { useState } from 'react';

export default function FinanceLinksForm({ initialData }: { initialData?: any }) {
  const [form, setForm] = useState(() => initialData ?? {
    arAccountId: null,
    apAccountId: null,
    defaultCashId: null,
    defaultBankId: null,
    preventDirectCashRevenue: true,
    revenueMap: { tickets: null, visas: null, subscriptions: null, segments: null },
    expenseMap: { tickets: null, visas: null, subscriptions: null },
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: call server action saveFinanceAccounts
      // For now optimistic UI simulation
      alert('تم حفظ الإعدادات (محاكاة)');
      // router.refresh() can be called after success
    } catch (err: any) {
      alert('فشل الحفظ: ' + String(err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>ربط الحسابات المالية</h3>
      <div>
        <label>AR (العملاء)</label>
        <input value={form.arAccountId ?? ''} onChange={e => setForm({ ...form, arAccountId: e.target.value || null })} />
      </div>
      <div>
        <label>AP (الموردين)</label>
        <input value={form.apAccountId ?? ''} onChange={e => setForm({ ...form, apAccountId: e.target.value || null })} />
      </div>
      <div>
        <label>Default Cash</label>
        <input value={form.defaultCashId ?? ''} onChange={e => setForm({ ...form, defaultCashId: e.target.value || null })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ'}</button>
      </div>
    </form>
  );
}
