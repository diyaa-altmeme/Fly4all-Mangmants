
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function RelationsSettings() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>إدارة العلاقات</CardTitle>
                    <CardDescription>
                        إدارة الحقول المخصصة، ومرادفات الاستيراد، وسياسات الدفع.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/relations/settings">
                            الانتقال إلى إعدادات العلاقات
                            <ArrowLeft className="ms-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5"/>صلاحيات العملاء</CardTitle>
                    <CardDescription>
                        التحكم في ما يمكن للعملاء رؤيته وتعديله في ملفاتهم الشخصية.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/settings/client-permissions">
                            الانتقال إلى صلاحيات العملاء
                            <ArrowLeft className="ms-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
