"use server";

import { getDb } from '../../../lib/firebase-admin';
import { DocumentData } from 'firebase-admin/firestore';

type AccountInput = {
  code?: string;
  "use server";
      id: d.id,
  import { ChartAccount, TreeNode, FinanceAccountsMap } from '@/lib/types';
  import { getDb } from '@/lib/firebase-admin';
  import { Timestamp, DocumentData } from 'firebase-admin/firestore';
  import { revalidatePath } from 'next/cache';
  import { cache } from 'react';
      code: data.code,
  const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';
      name: data.name,
  // === التوابع المساعدة ===
  function tsToNumber(ts: any): number {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (ts.toMillis && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return (ts.seconds || 0) * 1000 + (ts.nanoseconds || 0) / 1e6;
    return Date.now();
  }
      type: data.type,
  // === القراءة والجلب ===
  export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).orderBy('code').get();
      if (snapshot.empty) {
        console.warn("Chart of Accounts is empty. Please run: npm run seed:accounts");
        return [];
      }

      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        children: [],
        debit: 0,
        credit: 0
      }) as TreeNode);

      const accountMap = new Map<string, TreeNode>(accounts.map(acc => [acc.id, acc]));
      const tree: TreeNode[] = [];

      accounts.forEach(account => {
        if (account.parentId) {
          const parent = accountMap.get(account.parentId);
          if (parent) {
            parent.children.push(account);
          } else {
            tree.push(account);
          }
        } else {
          tree.push(account);
        }
      });

      return JSON.parse(JSON.stringify(tree));

    } catch (error) {
      console.error("Error getting chart of accounts:", error);
      return [];
    }
  });
      parentId: data.parentId || null,
  // === توليد الأكواد ===
  export async function generateAccountCode(parentId?: string): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (!parentId || parentId === 'root') {
      const query = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
        .where("parentId", "==", null)
        .get();
    
      if (query.empty) return "1";

      const codes = query.docs
        .map(doc => parseInt(doc.data().code, 10))
        .filter(num => !isNaN(num));

      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      return String(maxCode + 1);

    } else {
      const parentDoc = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
        .doc(parentId)
        .get();

      if (!parentDoc.exists) throw new Error("Parent account not found");
      const parentCode: string = parentDoc.data()?.code;

      const childrenQuery = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
        .where("parentId", "==", parentId)
        .get();

      if (childrenQuery.empty) return `${parentCode}-1`;

      const childCodes = childrenQuery.docs
        .map(doc => doc.data().code as string);

      const subNumbers = childCodes
        .map(code => code.split('-').pop())
        .map(numStr => parseInt(numStr || '0', 10))
        .filter(num => !isNaN(num));
        
      const maxSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) : 0;
      return `${parentCode}-${maxSubNumber + 1}`;
    }
  }

  // === العمليات على الحسابات ===
  export async function createAccount({ 
    name,
    type,
    parentId,
    isLeaf = true,
    code,
    description = ""
  }: { 
    name: string;
    type: string;
    parentId: string | null;
    isLeaf?: boolean;
    code: string;
    description?: string;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
  
    const docRef = db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc();
    const id = docRef.id;

    const doc = {
      id,
      name,
      code,
      type,
      parentId: parentId ?? null,
      isLeaf,
      description,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await docRef.set(doc);

    if (parentId) {
      await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
        .doc(parentId)
        .update({
          isLeaf: false,
          updatedAt: Timestamp.now()
        });
    }

    revalidatePath('/settings');
    return doc;
  }
      parentCode: data.parentCode || null,
  export async function updateAccount(
    id: string,
    input: Partial<{
      name: string;
      type: string;
      description: string;
      isLeaf: boolean;
    }>
  ): Promise<void> {
    const db = await getDb();
    const docRef = db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Account not found');

    // التحقق من وجود حسابات فرعية عند تغيير النوع
    if (input.type && input.type !== doc.data()?.type) {
      const childrenSnap = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
        .where('parentId', '==', id)
        .limit(1)
        .get();

      if (!childrenSnap.empty) {
        throw new Error('Cannot change type of an account that has children');
      }
    }

    await docRef.update({
      ...input,
      updatedAt: Timestamp.now()
    });

    revalidatePath('/settings');
  }

  export async function deleteAccount(id: string): Promise<void> {
    const db = await getDb();
    const docRef = db.collection(CHART_OF_ACCOUNTS_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Account not found');

    // التحقق من وجود حسابات فرعية
    const childrenSnap = await db.collection(CHART_OF_ACCOUNTS_COLLECTION)
      .where('parentId', '==', id)
      .limit(1)
      .get();

    if (!childrenSnap.empty) {
      throw new Error('Cannot delete account that has children');
    }

    // التحقق من استخدام الحساب في الإعدادات
    const settingsDoc = await db.collection('settings').doc('app_settings').get();
    const financeAccounts = settingsDoc.exists ? settingsDoc.data()?.financeAccounts : null;
  
    function idIsLinked(obj: any, targetId: string): boolean {
      if (!obj) return false;
      if (typeof obj === 'string') return obj === targetId;
      if (typeof obj === 'object') {
        return Object.values(obj).some(v => idIsLinked(v, targetId));
      }
      return false;
    }

    if (financeAccounts && idIsLinked(financeAccounts, id)) {
      throw new Error('Cannot delete account that is linked in finance settings');
    }

    await docRef.delete();
    revalidatePath('/settings');
  }

  // === تصدير وظائف إضافية ===
  export { getFinanceAccounts, saveFinanceAccounts } from "../advanced-accounts-setup/actions";
      isLeaf: !!data.isLeaf,
      description: data.description || null,
      createdAt: tsToNumber(data.createdAt),
      updatedAt: tsToNumber(data.updatedAt),
    };
  });
  return accounts;
}

export async function generateChildCode(parentId: string | null): Promise<string> {
  const db = await getDb();
  if (!parentId) {
    // top level — find last top-level code
    const snap = await db.collection('chart_of_accounts').where('parentId', '==', null).orderBy('code', 'desc').limit(1).get();
    const last = snap.docs[0]?.data()?.code as string | undefined;
    if (!last) return '1';
    const parts = last.split('-').map(p => parseInt(p, 10));
    const next = (parts[parts.length - 1] || 0) + 1;
    return `${next}`;
  }

  const parentDoc = await db.collection('chart_of_accounts').doc(parentId).get();
  if (!parentDoc.exists) throw new Error('Parent not found');
  const parentCode = parentDoc.data()?.code as string;

  const childrenSnap = await db.collection('chart_of_accounts').where('parentId', '==', parentId).orderBy('code', 'desc').limit(1).get();
  const lastChildCode = childrenSnap.docs[0]?.data()?.code as string | undefined;
  if (!lastChildCode) return `${parentCode}-1`;
  const lastSegment = lastChildCode.split('-').pop() || '0';
  const nextNum = parseInt(lastSegment, 10) + 1;
  return `${parentCode}-${nextNum}`;
}

export async function createAccount(input: AccountInput): Promise<any> {
  const db = await getDb();
  const now = new Date();
  let code = input.code;
  if (!code) {
    code = await generateChildCode(input.parentId ?? null);
  }

  const parentCode = input.parentId ? (await db.collection('chart_of_accounts').doc(input.parentId).get()).data()?.code : null;

  const docRef = await db.collection('chart_of_accounts').add({
    code,
    name: input.name,
    type: input.type,
    parentId: input.parentId || null,
    parentCode: parentCode || null,
    isLeaf: !!input.isLeaf,
    description: input.description || null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    code,
    name: input.name,
    type: input.type,
    parentId: input.parentId || null,
    parentCode: parentCode || null,
    isLeaf: !!input.isLeaf,
    description: input.description || null,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  };
}

export async function updateAccount(id: string, input: Partial<AccountInput> & { type?: string }): Promise<void> {
  const db = await getDb();
  const docRef = db.collection('chart_of_accounts').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Account not found');

  // Prevent changing type if has children
  if (input.type && input.type !== doc.data()?.type) {
    const childrenSnap = await db.collection('chart_of_accounts').where('parentId', '==', id).limit(1).get();
    if (!childrenSnap.empty) throw new Error('Cannot change type of an account that has children');
    // TODO: also check links in settings and other systems
  }

  await docRef.update({
    ...input,
    updatedAt: new Date(),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  const docRef = db.collection('chart_of_accounts').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Account not found');

  const childrenSnap = await db.collection('chart_of_accounts').where('parentId', '==', id).limit(1).get();
  if (!childrenSnap.empty) throw new Error('Cannot delete account that has children');

  // check settings links
  const settingsDoc = await db.collection('settings').doc('app_settings').get();
  const financeAccounts = settingsDoc.exists ? settingsDoc.data()?.financeAccounts : null;
  function idIsLinked(obj: any, targetId: string): boolean {
    if (!obj) return false;
    if (typeof obj === 'string') return obj === targetId;
    if (typeof obj === 'object') {
      return Object.values(obj).some(v => idIsLinked(v, targetId));
    }
    return false;
  }
  if (financeAccounts && idIsLinked(financeAccounts, id)) {
    throw new Error('Cannot delete account that is linked in finance settings');
  }

  await docRef.delete();
}
"use server";

import { getDb } from '@/lib/firebase-admin';
import type { Account, FinanceAccountsSettings } from '@/lib/types';
import { tsToNumber } from '@/lib/types';

const COLLECTION = 'chart_of_accounts';

function incrementCode(code: string): string {
  const parts = code.split('-').map(p => parseInt(p, 10));
  const last = parts[parts.length - 1] || 0;
  parts[parts.length - 1] = last + 1;
  return parts.join('-');
}

export async function getAccountsTree(): Promise<Account[]> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).orderBy('code', 'asc').get();
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      parentCode: data.parentCode || null,
      isLeaf: !!data.isLeaf,
      description: data.description || null,
      createdAt: tsToNumber(data.createdAt),
      updatedAt: tsToNumber(data.updatedAt),
    } as Account;
  });
}

export async function getAccountsLite(): Promise<Array<{id:string; code:string; name:string; type:string; parentId:string | null;}>> {
  const accounts = await getAccountsTree();
  return accounts.map(a => ({ id: a.id, code: a.code, name: a.name, type: a.type, parentId: a.parentId }));
}

export async function generateChildCode(parentId: string | null): Promise<string> {
  const db = await getDb();
  if (!parentId) {
    // top-level: find max top-level code
    const snap = await db.collection(COLLECTION).where('parentId', '==', null).orderBy('code', 'desc').limit(1).get();
    if (snap.empty) return '1';
    const last = snap.docs[0].data().code as string;
    return incrementCode(last);
  }
  // find parent
  const parentDoc = await db.collection(COLLECTION).doc(parentId).get();
  if (!parentDoc.exists) throw new Error('Parent not found');
  const parentCode = parentDoc.data()?.code as string;
  // find children
  const snap = await db.collection(COLLECTION).where('parentId', '==', parentId).orderBy('code', 'desc').limit(1).get();
  if (snap.empty) return `${parentCode}-1`;
  const last = snap.docs[0].data().code as string;
  return incrementCode(last);
}

interface CreateAccountInput {
  name: string;
  type: string;
  parentId?: string | null;
  code?: string | null;
  description?: string | null;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const db = await getDb();
  const now = Date.now();
  let code = input.code || null;
  if (!code) {
    code = await generateChildCode(input.parentId || null);
  }
  // ensure uniqueness
  const existing = await db.collection(COLLECTION).where('code', '==', code).limit(1).get();
  if (!existing.empty) throw new Error('Account code already exists');

  const docRef = db.collection(COLLECTION).doc();
  const docData = {
    code,
    name: input.name,
    type: input.type,
    parentId: input.parentId || null,
    parentCode: null as string | null,
    isLeaf: true,
    description: input.description || null,
    createdAt: now,
    updatedAt: now,
  };

  // set parentCode if parent exists
  if (input.parentId) {
    const p = await db.collection(COLLECTION).doc(input.parentId).get();
    if (p.exists) {
      docData.parentCode = p.data()?.code || null;
      // parent is no longer leaf
      await db.collection(COLLECTION).doc(input.parentId).update({ isLeaf: false, updatedAt: now });
    }
  }

  await docRef.set(docData);
  return {
    id: docRef.id,
    code: docData.code,
    name: docData.name,
    type: docData.type as any,
    parentId: docData.parentId,
    parentCode: docData.parentCode,
    isLeaf: !!docData.isLeaf,
    description: docData.description,
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
  } as Account;
}

export async function updateAccount(id: string, input: Partial<CreateAccountInput>): Promise<void> {
  const db = await getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Account not found');
  const data = doc.data() as any;

  // If changing type, check children
  if (input.type && input.type !== data.type) {
    const children = await db.collection(COLLECTION).where('parentId', '==', id).limit(1).get();
    if (!children.empty) throw new Error('Cannot change type of an account with children');
    // check settings usage
    const settingsDoc = await db.collection('settings').doc('app_settings').get();
    const finance = settingsDoc.exists ? (settingsDoc.data()?.financeAccounts as FinanceAccountsSettings | undefined) : undefined;
    if (finance) {
      const used = Object.values(finance).some(v => v === id);
      if (used) throw new Error('Cannot change type of an account used in finance settings');
    }
  }

  const now = Date.now();
  await docRef.update({ ...input, updatedAt: now });
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Account not found');

  // Prevent deletion if has children
  const children = await db.collection(COLLECTION).where('parentId', '==', id).limit(1).get();
  if (!children.empty) throw new Error('Cannot delete account with children');

  // Prevent deletion if used in finance settings
  const settingsDoc = await db.collection('settings').doc('app_settings').get();
  const finance = settingsDoc.exists ? (settingsDoc.data()?.financeAccounts as any | undefined) : undefined;
  if (finance) {
    const used = Object.values(finance).some((v: any) => v === id);
    if (used) throw new Error('Cannot delete account used in finance settings');
  }

  await docRef.delete();
}

export async function getFinanceAccounts(): Promise<FinanceAccountsSettings> {
  const db = await getDb();
  const settingsRef = db.collection('settings').doc('app_settings');
  const doc = await settingsRef.get();
  const empty: FinanceAccountsSettings = {
    arAccountId: null,
    apAccountId: null,
    defaultCashId: null,
    defaultBankId: null,
    preventDirectCashRevenue: false,
    revenueMap: { tickets: null, visas: null, subscriptions: null, segments: null },
    expenseMap: { tickets: null, visas: null, subscriptions: null },
  };
  if (!doc.exists) return empty;
  const data = doc.data() || {};
  return { ...empty, ...(data.financeAccounts || {}) } as FinanceAccountsSettings;
}

export async function saveFinanceAccounts(input: Partial<FinanceAccountsSettings>): Promise<void> {
  const db = await getDb();
  const settingsRef = db.collection('settings').doc('app_settings');
  // simple merge write
  await settingsRef.set({ financeAccounts: input }, { merge: true });
}

'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { getFinanceAccountsMap as getFinanceAccountsMapFromAdvanced, updateFinanceAccountsMap as updateFinanceAccountsMapFromAdvanced } from '../advanced-accounts-setup/actions';
import type { FinanceAccountsMap } from '@/lib/types';


const CHART_OF_ACCOUNTS_COLLECTION = 'chart_of_accounts';

// This function builds the entire chart of accounts, including balances.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const snapshot = await db.collection(CHART_OF_ACCOUNTS_COLLECTION).orderBy('code').get();
        if (snapshot.empty) {
             console.warn("Chart of Accounts is empty. Please run the seeding script: `npm run reset:accounts`");
            return [];
        }

        const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), children: [], debit: 0, credit: 0 }) as TreeNode);
        const accountMap = new Map<string, TreeNode>(accounts.map(acc => [acc.id, acc]));

        const tree: TreeNode[] = [];

        accounts.forEach(account => {
            if (account.parentId) {
                const parent = accountMap.get(account.parentId);
                if (parent) {
                    parent.children.push(account);
                } else {
                    tree.push(account); // root if parent not found
                }
            } else {
                tree.push(account);
            }
        });

        // Balance calculation can be added later if needed, for now we keep it simple.

        return JSON.parse(JSON.stringify(tree)); // Serialize to plain objects

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

  revalidatePath('/settings');
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

export async function getFinanceAccountsMap(): Promise<FinanceAccountsMap> {
    return await getFinanceAccountsMapFromAdvanced();
}

export async function updateFinanceAccountsMap(payload: FinanceAccountsMap) {
    return await updateFinanceAccountsMapFromAdvanced(payload);
}
