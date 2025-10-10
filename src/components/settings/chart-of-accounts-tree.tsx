
"use client";

import * as React from 'react';
import type { TreeNode } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Banknote, Landmark, TrendingDown, TrendingUp } from 'lucide-react';

const formatCurrency = (amount: number) => {
    if (amount === 0) return '0.00';
    return new Intl.NumberFormat('en-US').format(amount);
};

const NodeDisplay = ({ node, level = 0 }: { node: TreeNode, level?: number }) => {
    const isParent = node.children && node.children.length > 0;
    const balance = node.credit - node.debit;
    
    let colorClass = "text-muted-foreground";
    if (node.type === 'asset' || node.type === 'expense') {
        if (balance > 0) colorClass = 'text-green-600';
        else if (balance < 0) colorClass = 'text-red-600';
    } else if (node.type === 'liability' || node.type === 'revenue') {
         if (balance > 0) colorClass = 'text-red-600';
        else if (balance < 0) colorClass = 'text-green-600';
    }
    
    const nodeContent = (
      <div className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-4">
            <span className="font-mono text-xs w-20 text-muted-foreground">{node.code}</span>
            <span className="font-semibold">{node.name}</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-sm">
            <div className="w-28 text-right text-green-600 flex items-center justify-end gap-2">
                <span>{formatCurrency(node.credit)}</span>
                <TrendingUp className="h-4 w-4" />
            </div>
            <div className="w-28 text-right text-red-600 flex items-center justify-end gap-2">
                 <span>{formatCurrency(node.debit)}</span>
                 <TrendingDown className="h-4 w-4" />
            </div>
            <div className={cn("w-28 text-right font-bold flex items-center justify-end gap-2", colorClass)}>
                 <span>{formatCurrency(balance)}</span>
                 <Landmark className="h-4 w-4" />
            </div>
        </div>
      </div>
    );

    if (isParent) {
        return (
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={node.id} className="border-b-0">
                    <AccordionTrigger className="font-bold hover:no-underline text-base py-2">
                        {nodeContent}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className={cn("space-y-1 border-primary/50", level > 0 ? "mr-6 border-r-2" : "")}>
                            {node.children.map(child => <NodeDisplay key={child.id} node={child} level={level + 1} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    }

    return (
         <div className={cn("pr-4", level > 0 ? "mr-6 border-r-2 border-primary/20" : "")}>
            {nodeContent}
        </div>
    );
};


export default function ChartOfAccountsTree({ data }: { data: TreeNode[] }) {
  return (
    <div className="space-y-2">
      {data.map(node => (
        <NodeDisplay key={node.id} node={node} />
      ))}
    </div>
  );
}
