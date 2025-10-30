
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode, JournalVoucher, Client, Supplier, Box, Exchange } from '@/lib/types';
import { cache } from 'react';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

// This function builds the entire chart of accounts, including balances from relations.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const [staticAccountsSnap, clientsSnap, vouchersSnap] = await Promise.all([
            db.collection(CHART_OF_ACCOUNTS_COLLECTION).orderBy('code').get(),
            db.collection('clients').get(),
            db.collection('journal-vouchers').get(),
        ]);

        const accountBalances: Record<string, { debit: number; credit: number }> = {};

        // 1. Calculate balances for all accounts from journal vouchers
        vouchersSnap.forEach(doc => {
            const voucher = doc.data() as JournalVoucher;
            if (voucher.isDeleted) return;

            const processEntries = (entries: any[], type: 'debit' | 'credit') => {
                 if (!entries) return;
                 entries.forEach(entry => {
                    if (!entry.accountId) return;
                    if (!accountBalances[entry.accountId]) {
                        accountBalances[entry.accountId] = { debit: 0, credit: 0 };
                    }
                    accountBalances[entry.accountId][type] += entry.amount || 0;
                });
            };

            processEntries(voucher.debitEntries, 'debit');
            processEntries(voucher.creditEntries, 'credit');
        });

        // 2. Initialize static accounts from the chart_of_accounts collection
        const accounts = staticAccountsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            debit: 0, 
            credit: 0,
            children: [],
        } as TreeNode));
        
        const accountMap = new Map<string, TreeNode>(accounts.map(acc => [acc.id, acc]));

        // Find parent nodes for clients and suppliers by their standard codes
        const accountsReceivableParent = accounts.find(a => a.code === '1-1-2-1');
        const accountsPayableParent = accounts.find(a => a.code === '2-1-1-1');

        // 3. Create dynamic nodes for clients/suppliers
        clientsSnap.forEach(doc => {
            const client = doc.data() as Client;
            const balances = accountBalances[doc.id] || { debit: 0, credit: 0 };
            
            const baseNode = {
                id: doc.id,
                name: client.name,
                code: client.code || doc.id.substring(0, 6),
                debit: balances.debit,
                credit: balances.credit,
                children: [],
            };

            // Add to Accounts Receivable (الذمم المدينة)
            if ((client.relationType === 'client' || client.relationType === 'both') && accountsReceivableParent) {
                const clientNode: TreeNode = { ...baseNode, type: 'client', parentId: accountsReceivableParent.id };
                if (!accountsReceivableParent.children) accountsReceivableParent.children = [];
                accountsReceivableParent.children.push(clientNode);
            }

            // Add to Accounts Payable (الذمم الدائنة)
            if ((client.relationType === 'supplier' || client.relationType === 'both') && accountsPayableParent) {
                const supplierNode: TreeNode = { ...baseNode, type: 'supplier', parentId: accountsPayableParent.id };
                if (!accountsPayableParent.children) accountsPayableParent.children = [];
                accountsPayableParent.children.push(supplierNode);
            }
        });


        // 4. Build the tree structure for static accounts
        const tree: TreeNode[] = [];
        accounts.forEach(account => {
            if (account.parentId && accountMap.has(account.parentId)) {
                const parent = accountMap.get(account.parentId);
                if (parent && !parent.children.some(c => c.id === account.id)) {
                    parent.children.push(account);
                }
            } else {
                if (!tree.some(r => r.id === account.id)) {
                   tree.push(account);
                }
            }
        });

        // 5. Aggregate balances up the tree
        const sumChildrenBalances = (node: TreeNode): { debit: number; credit: number } => {
            if (!node.children || node.children.length === 0) {
                const balances = accountBalances[node.id] || { debit: 0, credit: 0 };
                node.debit = balances.debit;
                node.credit = balances.credit;
                return balances;
            }

            let totalDebit = 0;
            let totalCredit = 0;
            node.children.forEach(child => {
                const childTotals = sumChildrenBalances(child);
                totalDebit += childTotals.debit;
                totalCredit += childTotals.credit;
            });

            node.debit = totalDebit;
            node.credit = totalCredit;
            return { debit: totalDebit, credit: totalCredit };
        };

        tree.forEach(sumChildrenBalances);

        return JSON.parse(JSON.stringify(tree));

    } catch (error) {
        console.error("Error getting chart of accounts:", error);
        return [];
    }
});


export async function createAccount(data: {
  name: string;
  type: string;
  parentId: string | null;
  code: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available.");
  }
  
  const docRef = db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc();
  const id = docRef.id;

  const doc = {
    id,
    name: data.name,
    code: data.code,
    type: data.type,
    parentId: data.parentId ?? null,
    isLeaf: true, // New accounts are always leaves initially
    description: data.description ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await docRef.set(doc);

  if (data.parentId) {
      await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(data.parentId).update({
          isLeaf: false, 
          updatedAt: new Date().toISOString()
      });
  }

  revalidatePath('/settings/accounting/chart-of-accounts');
  return { ...doc, children: [] };
}

export async function updateAccount(id: string, data: Partial<TreeNode>) {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");
    
    const { children, debit, credit, ...updateData } = data; // Don't save balance fields
    
    await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id).update({
        ...updateData,
        updatedAt: new Date().toISOString(),
    });
    revalidatePath('/settings/accounting/chart-of-accounts');
    return { success: true };
}


export async function deleteAccount(id: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");
    
    const childrenSnap = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).where('parentId', '==', id).get();
    if(!childrenSnap.empty) {
        throw new Error("لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية.");
    }
    
    // You might want to check if there are any journal entries associated with this account before deleting.
    // For now, we proceed with deletion.

    await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id).delete();
    revalidatePath('/settings/accounting/chart-of-accounts');
    return { success: true };
}


export async function generateAccountCode(parentId?: string | null): Promise<string> {
    const db = await getDb();
    if (!db) {
        throw new Error("Database not available.");
    }

    if (!parentId || parentId === 'root') {
        const query = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
            .where("parentId", "==", null)
            .get();
        
        if (query.empty) {
            return "1";
        }

        const codes = query.docs.map(doc => parseInt(doc.data().code, 10)).filter(num => !isNaN(num));
        const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
        return String(maxCode + 1);

    } else {
        const parentDoc = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(parentId).get();
        if (!parentDoc.exists) {
            throw new Error("Parent account not found.");
        }
        const parentCode: string = parentDoc.data()?.code;

        const childrenQuery = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
            .where("parentId", "==", parentId)
            .get();

        if (childrenQuery.empty) {
            return `${parentCode}-1`;
        }

        const childCodes = childrenQuery.docs.map(doc => doc.data().code as string);
        const subNumbers = childCodes
            .map(code => {
                const parts = code.split('-');
                return parts.length > 1 ? parseInt(parts.pop() || '0', 10) : 0;
            })
            .filter(num => !isNaN(num));
            
        const maxSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) : 0;
        
        return `${parentCode}-${maxSubNumber + 1}`;
    }
}
