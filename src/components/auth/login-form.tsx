
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function LoginForm() {
  const { signIn, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  
  const createRipple = (e: React.MouseEvent) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");

      ripple.className = "ripple";
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;

      button.appendChild(ripple);

      setTimeout(() => {
          ripple.remove();
      }, 1000);
  };

  return (
    <div className="futuristic-card rounded-2xl p-8 max-w-md w-full relative overflow-hidden transform transition-all duration-500 hover:scale-[1.01]">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-900 opacity-20 blur-xl"></div>
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-indigo-900 opacity-20 blur-xl"></div>
      
      <div className="flex justify-center mb-6">
        <div className="floating glow relative">
          <i className="fas fa-rocket text-5xl text-indigo-500"></i>
          <div className="absolute -inset-2 rounded-full bg-indigo-500 opacity-20 blur-md"></div>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
        مرحباً بك
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-300 mb-8 transition-colors duration-500" style={{ color: 'var(--muted-text)'}}>
        سجل الدخول للوصول إلى لوحة التحكم المستقبلية
      </p>
      
      <form className="space-y-6" id="loginForm" onSubmit={handleSubmit}>
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 transition-colors duration-500" style={{ color: 'var(--muted-text)'}}>البريد الإلكتروني</Label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fas fa-envelope text-gray-400 transition-colors duration-500"></i>
            </div>
            <input type="email" id="email" className="input-futuristic w-full pr-10 py-3 px-4 rounded-lg focus:outline-none" placeholder="example@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        
        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 transition-colors duration-500" style={{ color: 'var(--muted-text)'}}>كلمة المرور</Label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fas fa-lock text-gray-400 transition-colors duration-500"></i>
            </div>
            <input type="password" id="password" className="input-futuristic w-full pr-10 py-3 px-4 rounded-lg focus:outline-none" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input id="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-500 dark:text-gray-300 transition-colors duration-500" style={{ color: 'var(--muted-text)'}}>تذكرني</label>
          </div>
          <Link href="/auth/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-300">نسيت كلمة المرور؟</Link>
        </div>
        
        <button type="submit" className="btn-futuristic w-full py-3 px-4 rounded-lg font-medium relative overflow-hidden" disabled={internalLoading} onClick={createRipple}>
            {internalLoading ? <Loader2 className="inline ml-2 h-4 w-4 animate-spin" /> : null}
            تسجيل الدخول
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700 transition-colors duration-500" style={{ borderColor: 'var(--border-color)'}}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 dark:text-gray-400" style={{background: 'var(--card-bg)', color: 'var(--muted-text)'}}>أو سجل الدخول باستخدام</span>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-3">
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-300" style={{background: 'var(--input-bg)'}} onClick={createRipple}>
            <i className="fab fa-google text-red-500"></i>
          </a>
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-300" style={{background: 'var(--input-bg)'}} onClick={createRipple}>
            <i className="fab fa-twitter text-blue-400"></i>
          </a>
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all duration-300" style={{background: 'var(--input-bg)'}} onClick={createRipple}>
            <i className="fab fa-apple text-gray-700 dark:text-gray-300"></i>
          </a>
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-500" style={{ color: 'var(--muted-text)'}}>
        ليس لديك حساب؟ <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-300">سجل الآن</a>
      </div>
    </div>
  );
}
