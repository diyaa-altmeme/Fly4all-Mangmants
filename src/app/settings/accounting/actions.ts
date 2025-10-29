
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode, JournalVoucher, Client, Supplier, Box, Exchange } from '@/lib/types';
import { cache } from 'react';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

// This function builds the entire chart of accounts, including balances.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).get();
        if (snapshot.empty) return [];

        const accounts = snapshot.docs.map(doc => doc.data() as TreeNode);

        const buildTree = (items: TreeNode[], parentId: string | null = null): TreeNode[] => {
            return items
                .filter(item => item.parentId === parentId)
                .map(item => ({ ...item, children: buildTree(items, item.id) }));
        };
        
        const tree = buildTree(accounts);

        const sumChildren = (node: TreeNode): {debit: number, credit: number} => {
            if (!node.children || node.children.length === 0) {
                return { debit: node.debit || 0, credit: node.credit || 0 };
            }
            const totals = node.children.reduce((acc, child) => {
                const childTotals = sumChildren(child);
                acc.debit += childTotals.debit;
                acc.credit += childTotals.credit;
                return acc;
            }, { debit: 0, credit: 0 });
            
            node.debit = totals.debit;
            node.credit = totals.credit;
            return totals;
        };

        tree.forEach(sumChildren);

        return tree;

    } catch (error) {
        console.error("Error getting chart of accounts:", error);
        return [];
    }
});


export async function createAccount({ name, type, parentId, isLeaf, code, description }: { 
  name: string;
  type: string;
  parentId: string | null;
  isLeaf?: boolean;
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
    name,
    code,
    type,
    parentId: parentId ?? null,
    isLeaf,
    description: description ?? "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await docRef.set(doc);

  if (parentId) {
      await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(parentId).update({
          isLeaf: false,
          updatedAt: Timestamp.now()
      });
  }

  revalidatePath('/settings/accounting');
  return doc;
}


export async function generateAccountCode(parentId?: string): Promise<string> {
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
            return `${parentCode}.1`;
        }

        const childCodes = childrenQuery.docs.map(doc => doc.data().code as string);
        const subNumbers = childCodes
            .map(code => code.split('.').pop())
            .map(numStr => parseInt(numStr || '0', 10))
            .filter(num => !isNaN(num));
            
        const maxSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) : 0;
        
        return `${parentCode}.${maxSubNumber + 1}`;
    }
}

