import React from 'react';
import { getAccountsLite, getFinanceAccounts } from './actions';
import FinanceLinksForm from './components/finance-links-form';

export default async function Page() {
  const accounts = await getAccountsLite();
  const settings = await getFinanceAccounts();

  return (
    <div style={{ padding: 20 }}>
      <h1>إعداد الحسابات المتقدمة</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>شجرة (خفيفة)</h3>
          <ul>
            {accounts.slice(0, 50).map(a => (
              <li key={a.id}><strong>{a.code}</strong> — {a.name}</li>
            ))}
          </ul>
        </div>
        <div style={{ width: 420 }}>
          {/* @ts-ignore */}
          <FinanceLinksForm initialData={settings.financeAccounts} />
        </div>
      </div>
    </div>
  );
}

// This page is now deprecated. The main settings page at /settings
// fetches all necessary data and renders the correct component.
// This is kept as a redirect for any old bookmarks.
import { redirect } from 'next/navigation';

export default function DeprecatedAdvancedAccountsSetupPage() {
    redirect('/settings');
    return null;
}
