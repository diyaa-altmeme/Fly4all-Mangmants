'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

export async function createAccount({ name, type, parentId, isLeaf = true, code }: { name: string, type: string, parentId: string | null, isLeaf?: boolean, code: string }) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available.");
  }
  const id = nanoid();
  await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id).set({
    id,
    name,
    type,
    parentId: parentId ?? null,
    isLeaf,
    code,
    createdAt: new Date()
  });
  revalidatePath('/settings/advanced-accounts-setup');
  return { id };
}

export async function getChartOfAccounts(): Promise<TreeNode[]> {
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
        
        return buildTree(accounts);

    } catch (error) {
        console.error("Error getting chart of accounts:", error);
        return [];
    }
}
