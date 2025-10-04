
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { User, Box, Role } from '@/lib/types';
import UserForm from './user-form';
import { Button } from '@/components/ui/button';

interface UserFormDialogProps {
  isEditing?: boolean;
  user?: User;
  boxes: Box[];
  roles: Role[];
  children: React.ReactNode;
  onUserAdded?: () => void;
  onUserUpdated?: () => void;
}

export default function UserFormDialog({ 
    isEditing = false, 
    user, 
    boxes,
    roles,
    children, 
    onUserAdded,
    onUserUpdated
}: UserFormDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    if (isEditing && onUserUpdated) {
        onUserUpdated();
    } else if (!isEditing && onUserAdded) {
        onUserAdded();
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'قم بتحديث المعلومات أدناه.' : 'أدخل تفاصيل المستخدم الجديد وقم بتعيين الصلاحيات.'}
          </DialogDescription>
        </DialogHeader>
        <UserForm 
            isEditing={isEditing}
            initialData={user}
            boxes={boxes}
            roles={roles}
            onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
