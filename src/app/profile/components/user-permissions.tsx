
"use client";

import React from 'react';
import type { User } from '@/lib/types';
import { PERMISSION_MODULES } from '@/lib/permissions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface UserPermissionsProps {
  user: User;
}

export default function UserPermissions({ user }: UserPermissionsProps) {
    if (!user || !user.permissions) {
        return <p>لا توجد صلاحيات لعرضها.</p>;
    }
    
    if (user.role === 'admin') {
         return (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                <p className="font-bold text-green-700 dark:text-green-300">لديك صلاحيات مدير النظام الكاملة.</p>
            </div>
         )
    }

    return (
        <Accordion type="multiple" className="w-full space-y-2">
            {PERMISSION_MODULES.map(module => {
                const grantedPermissions = module.permissions.filter(p => user.permissions.includes(p.id));
                if (grantedPermissions.length === 0) return null;

                return (
                    <AccordionItem value={module.id} key={module.id}>
                         <AccordionTrigger className="p-3 bg-muted/50 rounded-md font-bold hover:no-underline">
                           <div className="flex items-center gap-2">
                             <module.icon className="h-5 w-5 text-primary" />
                             {module.name}
                           </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4">
                           <div className="flex flex-wrap gap-2">
                             {grantedPermissions.map(perm => (
                               <Badge key={perm.id} variant="secondary">{perm.name}</Badge>
                             ))}
                           </div>
                         </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    );
}
