
"use client";

import { useState } from "react";
import { ChevronRight, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import AccountActions from "./account-actions";
import type { TreeNode } from "@/lib/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) => {
  if (amount === 0) return '0.00';
  const isNegative = amount < 0;
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
  return isNegative ? `(${formatted})` : formatted;
};

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; }> = {
  asset: { label: 'أصل', icon: Landmark, color: 'text-green-600' },
  liability: { label: 'التزام', icon: Landmark, color: 'text-red-600' },
  equity: { label: 'حقوق ملكية', icon: Landmark, color: 'text-blue-600' },
  revenue: { label: 'إيراد', icon: TrendingUp, color: 'text-emerald-600' },
  expense: { label: 'مصروف', icon: TrendingDown, color: 'text-purple-600' },
};


export default function AccountNode({ node, depth, onActionSuccess, allAccounts }: { node: TreeNode; depth: number, onActionSuccess: () => void, allAccounts: TreeNode[] }) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Open first two levels by default
  const hasChildren = node.children && node.children.length > 0;

  const balance = (node.debit || 0) - (node.credit || 0);
  
  const TypeInfo = node.type ? typeConfig[node.type] : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center group/node hover:bg-muted/50 rounded-md">
        <CollapsibleTrigger asChild disabled={!hasChildren}>
            <div className="flex items-center gap-1 cursor-pointer select-none py-1.5" style={{ paddingRight: `${depth * 1.25}rem`}}>
                {hasChildren ? (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && 'rotate-90')} />
                ) : (
                    <div className="w-4" />
                )}
                <span className="font-mono text-xs text-muted-foreground w-28 text-right">{node.code}</span>
                <span className="font-semibold">{node.name}</span>
                 {TypeInfo && (
                    <Badge variant="outline" className="text-xs">
                        <TypeInfo.icon className={cn("h-3 w-3 me-1", TypeInfo.color)} />
                        {TypeInfo.label}
                    </Badge>
                )}
            </div>
        </CollapsibleTrigger>
        <div className="flex-grow"></div>
         <div className="pe-2">
            <AccountActions node={node} onActionSuccess={onActionSuccess} allAccounts={allAccounts} />
        </div>
      </div>
      {hasChildren && (
        <CollapsibleContent>
            <div className="pl-4">
                {node.children.map(child => (
                    <AccountNode key={child.id} node={child} depth={depth + 1} onActionSuccess={onActionSuccess} allAccounts={allAccounts}/>
                ))}
            </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
