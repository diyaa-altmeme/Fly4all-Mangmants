
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import LoginForm from "./login-form"
import ClientLoginForm from "./client-login-form"
import RegisterForm from "./register-form";
import { Plane, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';


interface LoginPageClientProps {}

export default function LoginPageClient({}: LoginPageClientProps) {
  
  return (
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <Plane className="h-8 w-8 mx-auto text-primary"/>
            <h1 className="text-3xl font-bold">Mudarib</h1>
            <p className="text-balance text-muted-foreground">
                أدخل بياناتك للوصول إلى لوحة التحكم الخاصة بك
            </p>
        </div>
        <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="employee">دخول الموظفين</TabsTrigger>
                <TabsTrigger value="client">دخول العملاء</TabsTrigger>
                <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="employee">
                <LoginForm />
            </TabsContent>
            <TabsContent value="client">
                <ClientLoginForm />
            </TabsContent>
            <TabsContent value="register">
                <RegisterForm />
            </TabsContent>
        </Tabs>
    </div>
  );
}

    