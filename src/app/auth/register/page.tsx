
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import RegisterForm from '../login/components/register-form';
import Link from 'next/link';

export default function RegisterPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
             <Card className="w-full max-w-md">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                    <CardDescription>
                       املأ النموذج أدناه لطلب حساب جديد. سيتم مراجعته من قبل المسؤول.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RegisterForm />
                     <div className="mt-4 text-center text-sm">
                      هل لديك حساب بالفعل؟{" "}
                      <Link href="/auth/login" className="underline">
                        تسجيل الدخول
                      </Link>
                    </div>
                </CardContent>
             </Card>
        </div>
    );
}
