"use client";

import React, { useState } from 'react';

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isLeaf: boolean;
};

export default function AccountTreeClient({ accounts }: { accounts: Account[] }) {
  const [filter, setFilter] = useState('');

  const filtered = accounts.filter(a => a.name.includes(filter) || a.code.includes(filter));

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <input placeholder="بحث بالاسم أو الكود" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div>
        <ul>
          {filtered.map(a => (
            <li key={a.id}>
              <strong>{a.code}</strong> — {a.name} <em>({a.type})</em>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
