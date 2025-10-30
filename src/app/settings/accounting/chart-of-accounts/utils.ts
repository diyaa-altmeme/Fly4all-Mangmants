
import type { TreeNode } from '@/lib/types';

export function buildTree(accounts: TreeNode[]): TreeNode[] {
    if (!accounts || accounts.length === 0) {
        return [];
    }

    const map: { [key: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    // First pass: create a map of all nodes and initialize children
    accounts.forEach(acc => {
        map[acc.id] = { ...acc, children: [] };
    });

    // Second pass: build the tree structure
    accounts.forEach(acc => {
        if (acc.parentId && map[acc.parentId]) {
            // Check to avoid duplicates if data is messy
            if (!map[acc.parentId].children.some(child => child.id === acc.id)) {
                 map[acc.parentId].children.push(map[acc.id]);
            }
        } else {
            // This is a root node
             if (!roots.some(r => r.id === acc.id)) {
               roots.push(map[acc.id]);
            }
        }
    });
    
    // Recursive sort function
    const sortChildrenByCode = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                // Sort children by code numerically
                node.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
                // Recursively sort grandchildren
                sortChildrenByCode(node.children);
            }
        });
    };
    
    // Sort root nodes first
    roots.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    // Then sort all descendants
    sortChildrenByCode(roots);

    return roots;
}
