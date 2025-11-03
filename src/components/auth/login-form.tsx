
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Loader2, Rocket } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export function LoginForm() {
  const { signIn, loading: authLoading, error: authError } = useAuth();
  const { t, direction } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const internalLoading = authLoading;

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="futuristic-card rounded-2xl p-8 max-w-md w-full relative overflow-hidden transform transition-all duration-500 hover:scale-[1.01]">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-900 opacity-20 blur-xl"></div>
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-indigo-900 opacity-20 blur-xl"></div>
      
      <div className="flex justify-center mb-6">
        <div className="floating glow relative">
          <Rocket className="h-12 w-12 text-indigo-500" />
          <div className="absolute -inset-2 rounded-full bg-indigo-500 opacity-20 blur-md"></div>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
        {t('auth.login.title')}
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-300 mb-8 transition-colors duration-500">
        {t('auth.login.subtitle')}
      </p>

      <form className="space-y-6" id="loginForm" onSubmit={handleSubmit}>
        {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('common.error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        <div>
          <Label
            htmlFor="email"
            className={cn(
              'block text-sm font-medium text-gray-400 dark:text-gray-300 mb-2 transition-colors duration-500',
              direction === 'rtl' ? 'text-right' : 'text-left',
            )}
          >
            {t('auth.login.emailLabel')}
          </Label>
          <div className="relative">
            <div
              className={cn(
                'absolute inset-y-0 flex items-center pointer-events-none text-gray-400 transition-colors duration-500',
                direction === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3',
              )}
            >
              <i className="fas fa-envelope text-gray-400 transition-colors duration-500"></i>
            </div>
            <Input
              type="email"
              id="email"
              className={cn(
                'input-futuristic w-full py-3 px-4 rounded-lg focus:outline-none',
                direction === 'rtl' ? 'pr-10 text-right' : 'pl-10 text-left',
              )}
              placeholder={t('auth.login.emailPlaceholder')}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
          </div>
        </div>

        <div>
          <Label
            htmlFor="password"
            className={cn(
              'block text-sm font-medium text-gray-400 dark:text-gray-300 mb-2 transition-colors duration-500',
              direction === 'rtl' ? 'text-right' : 'text-left',
            )}
          >
            {t('auth.login.passwordLabel')}
          </Label>
          <div className="relative">
            <div
              className={cn(
                'absolute inset-y-0 flex items-center pointer-events-none text-gray-400 transition-colors duration-500',
                direction === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3',
              )}
            >
              <i className="fas fa-lock text-gray-400 transition-colors duration-500"></i>
            </div>
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'absolute inset-y-0 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                  direction === 'rtl' ? 'left-0 pl-3' : 'right-0 pr-3',
                )}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={cn(
                'input-futuristic w-full py-3 px-4 rounded-lg focus:outline-none',
                direction === 'rtl' ? 'pr-10 text-right' : 'pl-10 text-left',
              )}
              placeholder={t('auth.login.passwordPlaceholder')}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input id="remember-me" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label
              htmlFor="remember-me"
              className="ms-2 block text-sm text-gray-500 dark:text-gray-300 transition-colors duration-500"
            >
              {t('auth.login.rememberMe')}
            </label>
          </div>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-300"
          >
            {t('auth.login.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="btn-futuristic w-full py-3 px-4 rounded-lg text-white font-medium relative overflow-hidden" disabled={internalLoading}>
            {internalLoading ? <Loader2 className="inline h-4 w-4 animate-spin ms-2" /> : null}
            {t('auth.login.submit')}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700 transition-colors duration-500"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">
              {t('auth.login.socialDivider')}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg">
            <i className="fab fa-google text-red-500"></i>
          </a>
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg">
            <i className="fab fa-twitter text-blue-400"></i>
          </a>
          <a href="#" className="social-btn flex items-center justify-center py-2 px-4 rounded-lg">
            <i className="fab fa-apple text-gray-700 dark:text-gray-300"></i>
          </a>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-500">
        {t('auth.login.noAccount')}{' '}
        <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-300">
          {t('auth.login.registerNow')}
        </a>
      </div>
    </div>
  );
}
