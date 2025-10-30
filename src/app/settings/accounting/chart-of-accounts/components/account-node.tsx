
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

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; }> = {
  asset: { label: 'أصل', icon: Landmark, color: 'text-green-600' },
  liability: { label: 'التزام', icon: Landmark, color: 'text-red-600' },
  equity: { label: 'حقوق ملكية', icon: Landmark, color: 'text-blue-600' },
  revenue: { label: 'إيراد', icon: TrendingUp, color: 'text-emerald-600' },
  expense: { label: 'مصروف', icon: TrendingDown, color: 'text-purple-600' },
  client: { label: 'عميل', icon: Landmark, color: 'text-green-600' },
  supplier: { label: 'مورد', icon: Landmark, color: 'text-red-600' },
  box: { label: 'صندوق', icon: Landmark, color: 'text-green-600' },
  exchange: { label: 'بورصة', icon: Landmark, color: 'text-green-600' },
};


export default function AccountNode({ node, depth, onActionSuccess, allAccounts }: { node: TreeNode; depth: number, onActionSuccess: () => void, allAccounts: TreeNode[] }) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Open first two levels by default
  const hasChildren = node.children && node.children.length > 0;

  const balance = (node.debit || 0) - (node.credit || 0);
  
  const TypeInfo = node.type ? typeConfig[node.type] : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center group/node hover:bg-muted/50 rounded-md">
        <CollapsibleTrigger asChild>
            <div className="flex items-center gap-1 cursor-pointer select-none py-1.5 flex-grow" style={{ paddingRight: `${depth * 1.25}rem`}}>
                {hasChildren ? (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && 'rotate-90')} />
                ) : (
                    <div className="w-4" />
                )}
                <span className="font-mono text-xs text-muted-foreground w-28 text-right truncate">{node.code}</span>
                <span className="font-semibold">{node.name}</span>
                {TypeInfo && (
                    <Badge variant="outline" className="text-xs">
                        <TypeInfo.icon className={cn("h-3 w-3 me-1", TypeInfo.color)} />
                        {TypeInfo.label}
                    </Badge>
                )}
            </div>
        </CollapsibleTrigger>
        <div className="pe-2">
            <AccountActions node={node} onActionSuccess={onActionSuccess} allAccounts={allAccounts} />
        </div>
      </div>
      {hasChildren && (
        <CollapsibleContent>
            <div className="pr-4 border-r-2 border-primary/10 mr-5 space-y-1">
                {node.children.map(child => (
                    <AccountNode key={child.id} node={child} depth={depth + 1} onActionSuccess={onActionSuccess} allAccounts={allAccounts}/>
                ))}
            </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
