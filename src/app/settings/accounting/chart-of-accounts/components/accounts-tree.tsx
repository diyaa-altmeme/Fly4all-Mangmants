"use client";

import { useState, useMemo } from "react";
import AccountNode from "./account-node";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { buildTree } from "../utils";
import type { TreeNode } from "@/lib/types";
import AccountFormDialog from "./account-form";

interface AccountsTreeProps {
  accounts: TreeNode[];
  onActionSuccess: () => void;
}

const filterTree = (nodes: TreeNode[], searchTerm: string): TreeNode[] => {
    if (!searchTerm) return nodes;
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return nodes.reduce((acc, node) => {
        const children = node.children ? filterTree(node.children, searchTerm) : [];

        if (node.name.toLowerCase().includes(lowercasedSearchTerm) || node.code.includes(lowercasedSearchTerm) || children.length > 0) {
            acc.push({ ...node, children });
        }
        return acc;
    }, [] as TreeNode[]);
}

export default function AccountsTree({ accounts, onActionSuccess }: AccountsTreeProps) {
  const [search, setSearch] = useState("");
  const tree = useMemo(() => buildTree(accounts), [accounts]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="بحث عن حساب بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10"
            />
        </div>
        <AccountFormDialog allAccounts={accounts} onAccountAdded={onActionSuccess}>
            <Button><PlusCircle className="w-4 h-4 ml-2" />إضافة حساب رئيسي</Button>
        </AccountFormDialog>
      </div>

      <div className="border rounded-md p-3 bg-card min-h-[400px]">
        {filteredTree.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">لا توجد حسابات تطابق البحث.</div>
        ) : (
             filteredTree.map(node => (
                <AccountNode key={node.id} node={node} depth={0} onActionSuccess={onActionSuccess} allAccounts={accounts}/>
            ))
        )}
      </div>
    </div>
  );
}
