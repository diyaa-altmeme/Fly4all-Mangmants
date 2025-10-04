
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { User, Box, Role, HrData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, KeyRound, ShieldCheck, Loader2, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import UserFormDialog from "./user-form-dialog";
import { deleteUser } from "../actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import EditHrDataDialog from './edit-hr-data-dialog';

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};


const statusStyles: Record<User['status'], string> = {
  active: "text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300",
  pending: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300",
  blocked: "text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300",
  rejected: "text-gray-600 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300",
};
const statusTranslations: Record<User['status'], string> = {
  active: "نشط",
  pending: "قيد المراجعة",
  blocked: "محظور",
  rejected: "مرفوض",
};

const ActionsCell = ({ user, boxes, roles, onSuccess }: {
    user: User;
    boxes: Box[];
    roles: Role[];
    onSuccess: () => void;
}) => {
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await deleteUser(user.uid);
         if (result.success) {
            toast({ title: 'تم حذف المستخدم بنجاح' });
            onSuccess();
         } else {
             toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
         }
    };

    return (
        <div className="text-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <UserFormDialog isEditing user={user} boxes={boxes} roles={roles} onUserUpdated={onSuccess}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="me-2 h-4 w-4"/>تعديل بيانات الموظف</DropdownMenuItem>
                    </UserFormDialog>
                     <EditHrDataDialog user={user} onSuccess={onSuccess}>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="me-2 h-4 w-4"/>تعديل البيانات المالية</DropdownMenuItem>
                    </EditHrDataDialog>
                    <DropdownMenuItem disabled><KeyRound className="me-2 h-4 w-4"/>إعادة تعيين كلمة المرور</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-500"><Trash2 className="me-2 h-4 w-4"/>حذف</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم بشكل دائم.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className={buttonVariants({variant: 'destructive'})}>نعم، احذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};


export const getColumns = ({ boxes, roles, onSuccess }: {
    boxes: Box[],
    roles: Role[],
    onSuccess: () => void;
}): ColumnDef<HrData>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                المستخدم <ArrowUpDown className="ms-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={row.original.avatarUrl} alt={row.original.name} />
                    <AvatarFallback><CircleUserRound /></AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{row.original.name}</p>
                    <p className="text-xs text-muted-foreground">{row.original.email}</p>
                </div>
            </div>
        )
    },
    {
        accessorKey: 'baseSalary',
        header: 'الراتب الأساسي',
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.baseSalary)}</div>
    },
    {
        accessorKey: 'bonuses',
        header: 'الحوافز',
        cell: ({ row }) => <span className="text-green-600 text-center block">{formatCurrency(row.original.bonuses)}</span>
    },
    {
        accessorKey: 'deductions',
        header: 'الاستقطاعات',
        cell: ({ row }) => <span className="text-red-600 text-center block">{formatCurrency(row.original.deductions)}</span>
    },
    {
        id: 'calculatedTotalProfit',
        header: 'إجمالي الأرباح المحسوبة',
        accessorFn: row => row.calculatedTotalProfit,
        cell: ({ row }) => {
            const total = row.original.calculatedTotalProfit || 0;
            return <div className="text-center">{formatCurrency(total)}</div>;
        }
    },
    {
        id: 'calculatedNetSalary',
        header: 'صافي الراتب المحسوب',
        accessorFn: row => row.calculatedNetSalary,
        cell: ({ row }) => {
            const net = row.original.calculatedNetSalary || 0;
            return <span className="font-bold text-center block">{formatCurrency(net)}</span>
        }
    },
     {
        accessorKey: "role",
        header: () => <div className="text-center font-bold">الدور</div>,
        cell: ({ row }) => {
            const role = roles.find(r => r.id === row.original.role);
            return <div className="text-center"><Badge variant="outline">{role?.name || 'غير محدد'}</Badge></div>
        }
    },
    {
        id: "actions",
        header: () => <div className="text-center">خيارات</div>,
        cell: ({ row }) => <ActionsCell user={row.original} boxes={boxes} roles={roles} onSuccess={onSuccess} />
    }
];
