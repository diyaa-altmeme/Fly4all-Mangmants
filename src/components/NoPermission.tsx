
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const NoPermission = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-4 rounded-full">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">وصول مرفوض</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            عذراً، أنت لا تملك الصلاحيات اللازمة لعرض هذه الصفحة. يرجى التواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoPermission;
