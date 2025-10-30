import type { TreeNode } from '@/lib/types';

export function buildTree(accounts: TreeNode[]): TreeNode[] {
    if (!accounts || accounts.length === 0) {
        return [];
    }

    const map: { [key: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    // First pass: create a map of all nodes
    accounts.forEach(acc => {
        map[acc.id] = { ...acc, children: [] };
    });

    // Second pass: build the tree
    accounts.forEach(acc => {
        if (acc.parentId && map[acc.parentId]) {
            map[acc.parentId].children.push(map[acc.id]);
        } else {
            roots.push(map[acc.id]);
        }
    });
    
    // Sort children by code at each level
    const sortChildren = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
                sortChildren(node.children);
            }
        });
    };
    
    roots.sort((a,b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    sortChildren(roots);

    return roots;
}
