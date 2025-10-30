"use client";

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteAccount } from '../actions';
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
import type { TreeNode } from '@/lib/types';
import AccountFormDialog from './account-form';

interface AccountActionsProps {
  node: TreeNode;
  onActionSuccess: () => void;
  allAccounts: TreeNode[];
}

export default function AccountActions({ node, onActionSuccess, allAccounts }: AccountActionsProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteAccount(node.id);
      toast({ title: "تم حذف الحساب بنجاح" });
      onActionSuccess();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <AccountFormDialog allAccounts={allAccounts} parentId={node.id} onAccountAdded={onActionSuccess}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="flex justify-between">
            <span>إضافة فرع</span><PlusCircle className="h-4 w-4"/>
          </DropdownMenuItem>
        </AccountFormDialog>
        <AccountFormDialog allAccounts={allAccounts} isEditing account={node} onAccountAdded={onActionSuccess}>
          <DropdownMenuItem onSelect={e => e.preventDefault()} className="flex justify-between">
            <span>تعديل</span><Edit className="h-4 w-4"/>
          </DropdownMenuItem>
        </AccountFormDialog>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive flex justify-between">
                <span>حذف</span><Trash2 className="h-4 w-4"/>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الحساب "{node.name}" بشكل نهائي. لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} variant="destructive">نعم، قم بالحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
