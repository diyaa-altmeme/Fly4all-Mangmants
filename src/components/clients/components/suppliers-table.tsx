"use client";

import * as React from 'react';
import type { Supplier, CompanyGroup, WorkType } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import AddClientDialog from './add-client-dialog';
import { Badge } from '@/components/ui/badge';

interface SuppliersTableProps {
    data: Supplier[];
    companyGroups: CompanyGroup[];
    workTypes: WorkType[];
    onDataChanged: () => void;
}

export default function SuppliersTable({ data, companyGroups, workTypes, onDataChanged }: SuppliersTableProps) {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>البريد الإلكتروني</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(supplier => {
                        const group = companyGroups.find(g => g.id === supplier.groupId);
                        const workType = workTypes.find(w => w.id === supplier.workTypeId);

                        return (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-semibold">{supplier.name}</TableCell>
                                <TableCell>{supplier.phone}</TableCell>
                                <TableCell>{supplier.email || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={supplier.status === 'active' ? 'default' : 'destructive'}>
                                        {supplier.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <AddClientDialog isEditing initialData={supplier} onClientUpdated={onDataChanged}>
                                               <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="me-2 h-4 w-4"/>تعديل</DropdownMenuItem>
                                            </AddClientDialog>
                                            <DropdownMenuItem className="text-red-500 focus:text-red-500"><Trash2 className="me-2 h-4 w-4"/>حذف</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
