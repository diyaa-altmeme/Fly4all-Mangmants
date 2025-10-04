

"use client";

import React, { useState } from 'react';
import type { TreeNode } from '@/lib/types';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Folder, File, Building, User, Landmark, Briefcase, HandCoins, ArrowRightLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const getIconAndColor = (type: TreeNode['type']): { icon: React.ElementType, className: string } => {
    switch (type) {
        case 'group': return { icon: Folder, className: 'text-amber-500' };
        case 'box': return { icon: Landmark, className: 'text-indigo-500' };
        case 'client': return { icon: User, className: 'text-blue-500' };
        case 'supplier': return { icon: Building, className: 'text-rose-500' };
        case 'both': return { icon: Users, className: 'text-purple-500' };
        case 'expense': return { icon: ArrowRightLeft, className: 'text-red-600' };
        case 'revenue': return { icon: HandCoins, className: 'text-green-600' };
        case 'account':
        default: return { icon: File, className: 'text-gray-500' };
    }
};


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(amount);
}

const AccountRow = ({ node, level, onToggle, isExpanded }: { node: TreeNode, level: number, onToggle: (id: string) => void, isExpanded: boolean }) => {
    const { icon: Icon, className: iconClassName } = getIconAndColor(node.type);
    const hasChildren = node.children && node.children.length > 0;
    const balance = node.debit - node.credit;

    return (
        <TableRow>
            <TableCell style={{ paddingRight: `${level * 1.5}rem` }}>
                <div className="flex items-center gap-2">
                    {hasChildren ? (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggle(node.id)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6" /> // Spacer
                    )}
                    <Icon className={cn("h-4 w-4", iconClassName)} />
                    <span className="font-medium">{node.name}</span>
                </div>
            </TableCell>
            <TableCell className="font-mono text-center">{node.code}</TableCell>
            <TableCell className="text-center">
                 <Badge variant="outline" className="capitalize">{node.type}</Badge>
            </TableCell>
            <TableCell className="text-center font-mono text-blue-600">{formatCurrency(node.debit)}</TableCell>
            <TableCell className="text-center font-mono text-orange-600">{formatCurrency(node.credit)}</TableCell>
             <TableCell className={cn("text-center font-mono font-bold", balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(balance)}
            </TableCell>
        </TableRow>
    );
};

interface ChartOfAccountsTreeProps {
  data: TreeNode[];
}

export default function ChartOfAccountsTree({ data }: ChartOfAccountsTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2', '10', '20', '100', '101', '200']));

    const handleToggle = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const renderRows = (nodes: TreeNode[], level = 0) => {
        return nodes.flatMap(node => {
            const isExpanded = expandedIds.has(node.id);
            const rows = [<AccountRow key={node.id} node={node} level={level} onToggle={handleToggle} isExpanded={isExpanded} />];
            if (isExpanded && node.children) {
                rows.push(...renderRows(node.children, level + 1));
            }
            return rows;
        });
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableCell className="font-bold text-center w-[40%]">اسم الحساب</TableCell>
                        <TableCell className="font-bold text-center">الرمز</TableCell>
                        <TableCell className="font-bold text-center">النوع</TableCell>
                        <TableCell className="font-bold text-center">مدين</TableCell>
                        <TableCell className="font-bold text-center">دائن</TableCell>
                        <TableCell className="font-bold text-center">الرصيد</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {renderRows(data)}
                </TableBody>
            </Table>
        </div>
    );
}
