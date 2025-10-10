
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, User as UserIcon, Briefcase, ShieldCheck, MapPin, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { fetchUserByEmail } from '@/app/auth/login/actions';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

const UserDetailsCard = ({ user }: { user: User }) => (
    <Card className="mt-4 p-4 bg-muted/50 border-dashed">
        <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
        </div>
        <Separator className="my-3" />
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
             <div className="flex flex-col items-center gap-1 p-1 rounded-md">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">{user.role}</span>
            </div>
             <div className="flex flex-col items-center gap-1 p-1 rounded-md">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-semibold">{user.department || 'غير محدد'}</span>
            </div>
             <div className="flex flex-col items-center gap-1 p-1 rounded-md">
                <Briefcase className="h-5 w-5 text-primary" />
                <span className="font-semibold">{user.position || 'غير محدد'}</span>
            </div>
        </div>
    </Card>
);

export function LoginForm() {
  const { signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const debouncedEmail = useDebounce(email, 500);

  useEffect(() => {
    if (debouncedEmail) {
      setIsFetchingUser(true);
      fetchUserByEmail(debouncedEmail).then(details => {
        setUserDetails(details);
        setIsFetchingUser(false);
      });
    } else {
      setUserDetails(null);
    }
  }, [debouncedEmail]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    await signIn(email, password);
    // On success, the AuthProvider will handle the redirect.
    // If it fails, the AuthProvider might set an error state, or we can catch it.
    // For now, let's assume the auth context handles errors.
    // The previous implementation was catching the error here. Let's re-add that.
    const result = await signIn(email, password);
    if (result && result.error) {
        setError(result.error);
    }

    setIsLoading(false);
  };
  
  const internalLoading = isLoading || authLoading;

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
          
           {isFetchingUser && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>}
           {userDetails && <UserDetailsCard user={userDetails} />}

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

            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={internalLoading}
                >
                {internalLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تسجيل الدخول
            </Button>
        </form>
      </CardContent>
    </Card>
  );
}
