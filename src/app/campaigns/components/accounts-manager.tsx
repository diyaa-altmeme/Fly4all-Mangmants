
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import AddEditAccountDialog from './add-edit-account-dialog';
import { getWhatsappAccounts, deleteWhatsappAccount } from '../actions';
import type { WhatsappAccount } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AccountsManagerProps {
    onSaveSuccess: () => void;
}

export default function AccountsManager({ onSaveSuccess }: AccountsManagerProps) {
    const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        const result = await getWhatsappAccounts();
        if (result.success && result.accounts) {
            setAccounts(result.accounts);
        } else {
            toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleSuccess = () => {
        fetchAccounts();
        onSaveSuccess();
    };

    const handleDelete = async (id: string) => {
        const result = await deleteWhatsappAccount(id);
        if (result.success) {
            toast({ title: "تم حذف الحساب بنجاح" });
            handleSuccess();
        } else {
             toast({ title: "خطأ", description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="flex flex-row justify-between items-start px-0">
                <div>
                    <CardTitle className="text-lg">حسابات WhatsApp</CardTitle>
                </div>
                <AddEditAccountDialog onSaveSuccess={handleSuccess}>
                    <Button size="sm">
                        <PlusCircle className="me-2 h-4 w-4"/>
                        إضافة حساب
                    </Button>
                </AddEditAccountDialog>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : accounts.length === 0 ? (
                    <p className="text-muted-foreground text-center p-8">لا توجد حسابات مضافة.</p>
                ) : (
                    <div className="space-y-3">
                        {accounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{account.name}</p>
                                        <Badge variant="outline">{account.provider || 'ultramsg'}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-mono">{account.idInstance}</p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <AddEditAccountDialog isEditing account={account} onSaveSuccess={handleSuccess}>
                                             <DropdownMenuItem onSelect={e => e.preventDefault()}><Edit className="me-2 h-4 w-4"/>تعديل</DropdownMenuItem>
                                        </AddEditAccountDialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4"/>حذف</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                    <AlertDialogDescription>سيتم حذف الحساب بشكل دائم ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(account.id)} className={cn(buttonVariants({variant: 'destructive'}))}>نعم، احذف</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
