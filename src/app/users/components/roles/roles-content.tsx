
"use client";

import React, { useState } from 'react';
import type { Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PlusCircle, ShieldCheck, Trash2, Edit, CheckCheck } from 'lucide-react';
import { PERMISSION_MODULES } from '@/lib/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateUserRole } from '@/app/users/actions';
import { useToast } from '@/hooks/use-toast';
import RoleFormDialog from './role-form-dialog';
import { produce } from 'immer';

interface RolesContentProps {
    initialRoles: Role[];
    onDataChange: () => void;
}

const PermissionGroup = ({ title, permissions, assignedPermissions, onPermissionChange, disabled = false }: {
    title: string;
    permissions: { id: string; name: string }[];
    assignedPermissions: string[];
    onPermissionChange: (permissionId: string, checked: boolean) => void;
    disabled?: boolean;
}) => (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <h4 className="font-semibold text-base">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {permissions.map(perm => (
                <div key={perm.id} className="flex items-center space-x-2 space-x-reverse bg-background p-2 rounded-md border">
                    <Checkbox
                        id={perm.id}
                        checked={assignedPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => onPermissionChange(perm.id, !!checked)}
                        disabled={disabled}
                    />
                    <Label htmlFor={perm.id} className="text-sm font-medium leading-none cursor-pointer flex-grow text-right">
                        {perm.name}
                    </Label>
                </div>
            ))}
        </div>
    </div>
);


export default function RolesContent({ initialRoles, onDataChange }: RolesContentProps) {
    const [roles, setRoles] = useState(initialRoles || []);
    const [selectedRole, setSelectedRole] = useState<Role | null>(() => {
        if (initialRoles && initialRoles.length > 0) {
            return initialRoles.find(r => r.id === 'manager') || initialRoles[0];
        }
        return null;
    });
    const { toast } = useToast();

     React.useEffect(() => {
        setRoles(initialRoles || []);
        if (initialRoles && initialRoles.length > 0) {
            if (!selectedRole || !initialRoles.some(r => r.id === selectedRole.id)) {
                setSelectedRole(initialRoles.find(r => r.id === 'manager') || initialRoles[0]);
            }
        } else {
            setSelectedRole(null);
        }
    }, [initialRoles, selectedRole]);

    const handlePermissionChange = async (permissionId: string, checked: boolean) => {
        if (!selectedRole || selectedRole.id === 'admin') return;
        
        const updatedPermissions = checked
            ? [...selectedRole.permissions, permissionId]
            : selectedRole.permissions.filter(p => p !== permissionId);

        const updatedRole = produce(selectedRole, draft => {
            draft.permissions = updatedPermissions;
        });
        setSelectedRole(updatedRole);

        const result = await updateUserRole(selectedRole.id, { permissions: updatedPermissions });
        if (result.success) {
            toast({ title: `تم تحديث صلاحيات دور "${selectedRole.name}"` });
            onDataChange();
        } else {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            // Revert optimistic update on failure
            setSelectedRole(selectedRole);
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6 items-start">
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">الأدوار المتاحة</h3>
                     <RoleFormDialog onRoleAdded={onDataChange}>
                        <Button size="sm" variant="outline"><PlusCircle className="me-2 h-4 w-4"/> إضافة دور</Button>
                    </RoleFormDialog>
                </div>
                <div className="space-y-2">
                    {roles.map(role => (
                        <Card
                            key={role.id}
                            className={`cursor-pointer transition-all ${selectedRole?.id === role.id ? 'border-primary ring-2 ring-primary/50' : 'hover:border-primary/50'}`}
                            onClick={() => setSelectedRole(role)}
                        >
                            <CardHeader className="p-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-muted-foreground"/> {role.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1 text-xs">{role.description}</CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                         <RoleFormDialog isEditing role={role} onRoleUpdated={onDataChange}>
                                             <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4" /></Button>
                                         </RoleFormDialog>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={['admin', 'manager', 'editor', 'viewer'].includes(role.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
            <div className="sticky top-20">
                {selectedRole ? (
                     <Card>
                        <CardHeader>
                            <CardTitle>صلاحيات دور: {selectedRole.name}</CardTitle>
                             <CardDescription>حدد الصلاحيات التي يمكن للمستخدمين بهذا الدور الوصول إليها.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           {selectedRole.id === 'admin' ? (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/50 text-center p-4">
                                    <CheckCheck className="h-12 w-12 text-green-500 mb-2" />
                                    <h3 className="text-lg font-bold">صلاحية وصول كاملة</h3>
                                    <p className="text-muted-foreground text-sm">
                                        دور المدير يمتلك جميع الصلاحيات بشكل افتراضي ولا يمكن تعديلها.
                                    </p>
                                </div>
                            ) : (
                                PERMISSION_MODULES.map(module => (
                                    <PermissionGroup
                                        key={module.id}
                                        title={module.name}
                                        permissions={module.permissions}
                                        assignedPermissions={selectedRole.permissions || []}
                                        onPermissionChange={handlePermissionChange}
                                        disabled={selectedRole.id === 'admin'}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg p-12">
                        <p className="text-muted-foreground">الرجاء اختيار دور لعرض صلاحياته.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
