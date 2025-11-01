'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode, JournalVoucher } from '@/lib/types';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

// This function builds the entire chart of accounts, including balances from relations.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const [staticAccountsSnap, clientsSnap, suppliersSnap, boxesSnap, exchangesSnap, vouchersSnap] = await Promise.all([
            db.collection('chart_of_accounts').orderBy('code').get(),
            db.collection('clients').where('relationType', 'in', ['client', 'both']).get(),
            db.collection('clients').where('relationType', 'in', ['supplier', 'both']).get(),
            db.collection('boxes').get(),
            db.collection('exchanges').get(),
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
        const staticAccounts = staticAccountsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            debit: 0, 
            credit: 0,
            children: [],
        } as TreeNode));
        
        // 3. Create dynamic nodes for clients, suppliers, etc.
        const dynamicNodes: TreeNode[] = [];
        
        const createNode = (doc: FirebaseFirestore.DocumentSnapshot, type: 'client' | 'supplier' | 'box' | 'exchange', parentCode: string): TreeNode => {
            const data = doc.data() as any;
            const balances = accountBalances[doc.id] || { debit: 0, credit: 0 };
            const parent = staticAccounts.find(a => a.code === parentCode);
            if (!parent) {
                console.warn(`Parent with code ${parentCode} not found for ${data.name}.`);
            }
            return {
                id: doc.id,
                name: data.name,
                code: data.code || doc.id.substring(0, 6),
                type: type,
                parentId: parent ? parent.id : null,
                debit: balances.debit,
                credit: balances.credit,
                children: [],
                isLeaf: true,
            };
        };

        clientsSnap.forEach(doc => dynamicNodes.push(createNode(doc, 'client', '1-1-2-1')));
        suppliersSnap.forEach(doc => dynamicNodes.push(createNode(doc, 'supplier', '2-1-1-1')));
        boxesSnap.forEach(doc => dynamicNodes.push(createNode(doc, 'box', '1-1-1')));
        exchangesSnap.forEach(doc => dynamicNodes.push(createNode(doc, 'exchange', '1-1-2-2')));
        
        const allAccounts = [...staticAccounts, ...dynamicNodes];
        
        return JSON.parse(JSON.stringify(allAccounts));

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
