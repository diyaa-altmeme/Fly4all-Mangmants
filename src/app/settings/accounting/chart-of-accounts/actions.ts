'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

// This function builds the entire chart of accounts.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).orderBy('code').get();
        if (snapshot.empty) {
            console.warn("Chart of Accounts is empty. Consider seeding initial accounts.");
            return [];
        }

        const accounts = snapshot.docs.map(doc => ({
          id: doc.id, 
          ...doc.data(),
          debit: 0, // Placeholder
          credit: 0, // Placeholder
        } as TreeNode));
        
        return JSON.parse(JSON.stringify(accounts)); // Serialize to plain objects

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
    description: data.description ?? "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await docRef.set(doc);

  if (data.parentId) {
      await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(data.parentId).update({
          isLeaf: false, // This field is deprecated but we update it for compatibility
          updatedAt: Timestamp.now()
      });
  }

  revalidatePath('/settings/accounting/chart-of-accounts');
  return { ...doc, children: [] };
}

export async function updateAccount(id: string, data: Partial<TreeNode>) {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");
    
    const { children, ...updateData } = data; // Exclude children from update
    
    await db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id).update({
        ...updateData,
        updatedAt: Timestamp.now(),
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
            .map(code => code.split('-').pop())
            .map(numStr => parseInt(numStr || '0', 10))
            .filter(num => !isNaN(num));
            
        const maxSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) : 0;
        
        return `${parentCode}-${maxSubNumber + 1}`;
    }
}
