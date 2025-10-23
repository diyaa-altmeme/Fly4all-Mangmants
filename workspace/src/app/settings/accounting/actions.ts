
'use server';

import { getDb } from '@/lib/firebase-admin';
import type { TreeNode, JournalVoucher, Client, Supplier, Box, Exchange } from '@/lib/types';
import { cache } from 'react';

// This function builds the entire chart of accounts, including balances.
export const getChartOfAccounts = cache(async (): Promise<TreeNode[]> => {
    const db = await getDb();
    if (!db) return [];

    try {
        const [clientsSnap, suppliersSnap, boxesSnap, exchangesSnap, vouchersSnap] = await Promise.all([
            db.collection('clients').where('relationType', 'in', ['client', 'both']).get(),
            db.collection('clients').where('relationType', 'in', ['supplier', 'both']).get(),
            db.collection('boxes').get(),
            db.collection('exchanges').get(),
            db.collection('journal-vouchers').get(),
        ]);

        const accountBalances: Record<string, { debit: number; credit: number }> = {};

        const processEntry = (accountId: string, amount: number, type: 'debit' | 'credit') => {
            if (!accountId) return;
            if (!accountBalances[accountId]) {
                accountBalances[accountId] = { debit: 0, credit: 0 };
            }
            accountBalances[accountId][type] += amount;
        };

        vouchersSnap.forEach(doc => {
            const voucher = doc.data() as JournalVoucher;
            voucher.debitEntries?.forEach(entry => processEntry(entry.accountId, entry.amount, 'debit'));
            voucher.creditEntries?.forEach(entry => processEntry(entry.accountId, entry.amount, 'credit'));
        });

        const createNode = (doc: FirebaseFirestore.DocumentSnapshot, type: 'client' | 'supplier' | 'box' | 'exchange', parentId: string): TreeNode => {
            const data = doc.data() as any;
            const balances = accountBalances[doc.id] || { debit: 0, credit: 0 };
            return {
                id: doc.id,
                name: data.name,
                code: data.code || doc.id.substring(0, 6),
                type: type,
                parentId: parentId,
                debit: balances.debit,
                credit: balances.credit,
                children: [],
            };
        };
        
        const assets: TreeNode = { id: 'assets', name: 'الأصول', code: '1', type: 'asset', parentId: null, debit: 0, credit: 0, children: [] };
        const liabilities: TreeNode = { id: 'liabilities', name: 'الخصوم', code: '2', type: 'liability', parentId: null, debit: 0, credit: 0, children: [] };
        const revenues: TreeNode = { id: 'revenues', name: 'الإيرادات', code: '4', type: 'revenue', parentId: null, debit: 0, credit: 0, children: [] };
        const expenses: TreeNode = { id: 'expenses', name: 'المصروفات', code: '5', type: 'expense', parentId: null, debit: 0, credit: 0, children: [] };

        const currentAssets: TreeNode = { id: 'current-assets', name: 'الأصول المتداولة', code: '10', type: 'asset', parentId: 'assets', debit: 0, credit: 0, children: [] };
        const accountsReceivable: TreeNode = { id: 'accounts-receivable', name: 'الذمم المدينة (العملاء)', code: '101', type: 'asset', parentId: 'current-assets', debit: 0, credit: 0, children: [] };
        const cashAndBanks: TreeNode = { id: 'cash-and-banks', name: 'الصناديق والبنوك', code: '100', type: 'asset', parentId: 'current-assets', debit: 0, credit: 0, children: [] };
        const exchangesNode: TreeNode = { id: 'exchanges-node', name: 'البورصات', code: '102', type: 'asset', parentId: 'current-assets', debit: 0, credit: 0, children: [] };
        
        const currentLiabilities: TreeNode = { id: 'current-liabilities', name: 'الخصوم المتداولة', code: '20', type: 'liability', parentId: 'liabilities', debit: 0, credit: 0, children: [] };
        const accountsPayable: TreeNode = { id: 'accounts-payable', name: 'الذمم الدائنة (الموردين)', code: '200', type: 'liability', parentId: 'current-liabilities', debit: 0, credit: 0, children: [] };

        clientsSnap.forEach(doc => accountsReceivable.children.push(createNode(doc, 'client', 'accounts-receivable')));
        suppliersSnap.forEach(doc => accountsPayable.children.push(createNode(doc, 'supplier', 'accounts-payable')));
        boxesSnap.forEach(doc => cashAndBanks.children.push(createNode(doc, 'box', 'cash-and-banks')));
        exchangesSnap.forEach(doc => exchangesNode.children.push(createNode(doc, 'exchange', 'exchanges-node')));

        currentAssets.children.push(accountsReceivable, cashAndBanks, exchangesNode);
        currentLiabilities.children.push(accountsPayable);
        assets.children.push(currentAssets);
        liabilities.children.push(currentLiabilities);

        const sumChildren = (node: TreeNode) => {
            if (!node.children || node.children.length === 0) return;
            node.children.forEach(sumChildren);
            node.debit = node.children.reduce((acc, child) => acc + child.debit, 0);
            node.credit = node.children.reduce((acc, child) => acc + child.credit, 0);
        };

        [assets, liabilities, revenues, expenses].forEach(sumChildren);

        return [assets, liabilities, revenues, expenses];

    } catch (error) {
        console.error("Error getting chart of accounts:", error);
        return [];
    }
});
