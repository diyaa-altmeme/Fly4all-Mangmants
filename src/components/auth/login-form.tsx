
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export function LoginForm() {
  const { signIn, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const internalLoading = authLoading;

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    await signIn(email, password);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold">تسجيل الدخول</CardTitle>
        <CardDescription>
          أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى نظام Mudarib Accounting
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10"
                disabled={internalLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 pl-10"
                disabled={internalLoading}
                required
                autoComplete="current-password"
              />
               <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
            </div>
          </div>
          
           <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">تذكرني</span>
                </label>
                <Link href="/auth/forgot-password" passHref>
                    <span className="text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer">
                    نسيت كلمة المرور؟
                    </span>
                </Link>
              </div>
            <div className="flex flex-col gap-2">
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={internalLoading}
                    >
                    {internalLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    تسجيل الدخول
                </Button>
            </div>
        </form>
      </CardContent>
    </Card>
  );
}
