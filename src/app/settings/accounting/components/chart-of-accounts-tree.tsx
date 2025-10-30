
"use client";

import * as React from 'react';
import type { TreeNode } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Landmark, TrendingDown, TrendingUp } from 'lucide-react';

const formatCurrency = (amount: number) => {
    if (amount === 0) return '0.00';
    return new Intl.NumberFormat('en-US').format(amount);
};

const NodeContent = ({ node }: { node: TreeNode }) => {
    return (
        <div className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md">
            <div className="flex items-center gap-4">
                <span className="font-mono text-xs w-24 text-muted-foreground text-right">{node.code}</span>
                <span className="font-semibold">{node.name}</span>
            </div>
            {node.isLeaf && (
                <div className="flex items-center gap-6 font-mono text-sm">
                    {/* Balances are commented out for now as they are not calculated */}
                </div>
            )}
        </div>
    );
};

const NodeDisplay = ({ node, level = 0 }: { node: TreeNode, level?: number }) => {
    const isParent = node.children && node.children.length > 0;

    if (isParent) {
        return (
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={node.id} className="border-b-0">
                    <AccordionTrigger className="font-bold hover:no-underline text-base py-0">
                        <NodeContent node={node} />
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className={cn("space-y-1 pr-6 border-r-2 border-primary/20", level > 0 ? "mr-6" : "")}>
                            {node.children.map(child => <NodeDisplay key={child.id} node={child} level={level + 1} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    }

    return (
        <div className={cn("pr-4", level > 0 ? "mr-6" : "")}>
            <NodeContent node={node} />
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
