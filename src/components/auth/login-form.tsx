
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, Users, Shield, Briefcase, Building } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/types';
import { Autocomplete } from '../ui/autocomplete';

export function LoginForm() {
  const [userId, setUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoadingUsers(true);
        setLoadError('');
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('فشل في تحميل قائمة المستخدمين من الخادم.');
        }
        const fetchedUsers: User[] = await response.json();
        if (fetchedUsers.length === 0) {
            setLoadError('لم يتم العثور على مستخدمين. يرجى التأكد من إضافة مستخدمين في قاعدة البيانات.');
        }
        setUsers(fetchedUsers);
      } catch (error: any) {
        setLoadError(error.message || 'فشل في تحميل قائمة المستخدمين.');
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const userOptions = React.useMemo(() => 
    users.map(user => ({
      value: user.uid,
      label: user.name,
    })), 
  [users]);

  useEffect(() => {
    const user = users.find(u => u.uid === userId);
    setSelectedUser(user || null);
  }, [userId, users]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUser || !password) {
      setError('يرجى اختيار المستخدم وإدخال كلمة المرور');
      return;
    }

    const result = await signIn(selectedUser.email, password);
    
    if (!result.success) {
      setError(result.error || 'فشل تسجيل الدخول');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold">تسجيل الدخول</CardTitle>
        <CardDescription>
          اختر حسابك وأدخل كلمة المرور للوصول إلى نظام Mudarib Accounting
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
           {loadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ في تحميل المستخدمين</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="user-select">اختر المستخدم</Label>
            <div className="relative">
              <Users className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Autocomplete
                options={userOptions}
                value={userId}
                onValueChange={setUserId}
                placeholder={loadingUsers ? "جاري تحميل المستخدمين..." : "اختر المستخدم..."}
                disabled={loading || loadingUsers || !!loadError}
              />
            </div>
          </div>

          {selectedUser && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm justify-end">
                      <span className="font-mono">{selectedUser.email}</span>
                      <span className="font-semibold text-muted-foreground">:البريد</span>
                      <Mail className="h-4 w-4 text-muted-foreground"/>
                  </div>
                  <div className="flex items-center gap-2 text-sm justify-end">
                      <span className="font-bold">{selectedUser.role}</span>
                      <span className="font-semibold text-muted-foreground">:الدور</span>
                      <Shield className="h-4 w-4 text-muted-foreground"/>
                  </div>
                  <div className="flex items-center gap-2 text-sm justify-end">
                      <span className="font-bold">{selectedUser.department || 'غير محدد'}</span>
                      <span className="font-semibold text-muted-foreground">:القسم</span>
                      <Building className="h-4 w-4 text-muted-foreground"/>
                  </div>
                  <div className="flex items-center gap-2 text-sm justify-end">
                      <span className="font-bold">{selectedUser.position || 'غير محدد'}</span>
                      <span className="font-semibold text-muted-foreground">:المنصب</span>
                      <Briefcase className="h-4 w-4 text-muted-foreground"/>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 pl-10"
                disabled={loading}
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
            disabled={loading || !userId || !!loadError}
          >
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
