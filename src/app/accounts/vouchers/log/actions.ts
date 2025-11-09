
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { JournalVoucher, Client, Supplier, Box, User, AppSettings, Exchange, TreeNode } from '@/lib/types';
import { normalizeVoucherType, getVoucherTypeLabel } from '@/lib/accounting/voucher-types';

export type Voucher = JournalVoucher & {
  voucherId: string;
  voucherTypeLabel: string;
  normalizedType: NormalizedVoucherType;
  companyName?: string;
  boxName?: string;
};

export async function getAllVouchers(
  clients: Client[] = [], 
  suppliers: Supplier[] = [],
  boxes: Box[] = [],
  users: User[] = [],
  settings: AppSettings,
  exchanges: Exchange[] = [],
  chartOfAccounts: TreeNode[] = []
): Promise<Voucher[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection('journal-vouchers')
            .orderBy('createdAt', 'desc')
            .limit(1000)
            .get();

        if (snapshot.empty) return [];

        const allAccountsMap = new Map<string, { name: string, type: string }>();
        clients.forEach(c => allAccountsMap.set(c.id, { name: c.name, type: 'client' }));
        suppliers.forEach(s => allAccountsMap.set(s.id, { name: s.name, type: 'supplier' }));
        boxes.forEach(b => allAccountsMap.set(b.id, { name: b.name, type: 'box' }));
        exchanges.forEach(e => allAccountsMap.set(e.id, { name: e.name, type: 'exchange' }));
        chartOfAccounts.forEach(acc => allAccountsMap.set(acc.id, { name: acc.name, type: acc.type }));

        const userMap = new Map(users.map(u => [u.uid, u.name]));

        const vouchers = snapshot.docs.map(doc => {
            const data = JSON.parse(JSON.stringify({ ...doc.data(), id: doc.id, voucherId: doc.id })) as JournalVoucher;
            
            const normalizedType = normalizeVoucherType(data.voucherType);
            const voucherTypeLabel = getVoucherTypeLabel(data.voucherType);

            const allEntries = [...(data.debitEntries || []), ...(data.creditEntries || [])];
            
            const clientOrSupplierEntry = allEntries.find(e => {
                const acc = allAccountsMap.get(e.accountId);
                return acc?.type === 'client' || acc?.type === 'supplier';
            });
            
            let companyName = clientOrSupplierEntry ? allAccountsMap.get(clientOrSupplierEntry.accountId)?.name : undefined;
            if (!companyName && allEntries.length > 0) {
                 const primaryAccount = allAccountsMap.get(allEntries[0].accountId);
                 if (primaryAccount && !['box', 'exchange'].includes(primaryAccount.type)) {
                     companyName = primaryAccount.name;
                 }
            }
             if (!companyName && allEntries.length > 1) {
                companyName = 'حركات متعددة';
            }
             if (!companyName && data.originalData?.companyName) {
                companyName = data.originalData.companyName;
            }


            const boxEntry = allEntries.find(e => allAccountsMap.get(e.accountId)?.type === 'box');
            const boxName = boxEntry ? allAccountsMap.get(boxEntry.accountId)?.name : undefined;
            
            if (data.date && (data.date as any)._seconds) {
                data.date = new Date((data.date as any)._seconds * 1000).toISOString();
            }
            if (data.createdAt && (data.createdAt as any)._seconds) {
                data.createdAt = new Date((data.createdAt as any)._seconds * 1000).toISOString();
            }

            return {
                ...data,
                normalizedType,
                voucherTypeLabel,
                companyName,
                boxName,
                officer: userMap.get(data.createdBy || '') || data.officer,
            } as Voucher;
        });

        return vouchers;

    } catch (error) {
        console.error("Error getting all vouchers:", String(error));
        throw new Error(`Failed to fetch vouchers. A database index might be required. Original error: ${String(error)}`);
    }
}
