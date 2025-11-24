
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { app } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export default function ForgotPasswordPage() {
  const { t, direction } = useTranslation();
  const [email, setEmail] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setSuccess(false);

    if (!email) {
      setErrorKey('auth.forgotPassword.errors.enterEmail');
      return;
    }

    setLoading(true);
    const auth = getAuth(app);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            setErrorKey('auth.forgotPassword.errors.userNotFound');
        } else {
            setErrorKey('auth.forgotPassword.errors.generic');
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="login-page-body min-h-screen flex items-center justify-center p-4">
      <div className="futuristic-card rounded-2xl p-8 max-w-md w-full relative overflow-hidden">
         <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-900 opacity-20 blur-xl"></div>
         <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-indigo-900 opacity-20 blur-xl"></div>

        <div className="flex justify-center mb-6">
            <div className="floating glow relative">
                <i className="fas fa-key text-5xl text-indigo-500"></i>
                <div className="absolute -inset-2 rounded-full bg-indigo-500 opacity-20 blur-md"></div>
            </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            {t('auth.forgotPassword.title')}
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-8" style={{ color: 'var(--muted-text)'}}>
            {t('auth.forgotPassword.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
            {errorKey && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('common.error')}</AlertTitle>
                <AlertDescription>{t(errorKey)}</AlertDescription>
              </Alert>
            )}
            {success && (
                <Alert variant="default" className="bg-green-500/10 border-green-500/30 text-green-300">
                    <AlertCircle className="h-4 w-4 text-green-400"/>
                    <AlertTitle className="text-green-300">{t('auth.forgotPassword.success.title')}</AlertTitle>
                    <AlertDescription className="text-green-400">
                        {t('auth.forgotPassword.success.description')}
                    </AlertDescription>
                </Alert>
            )}
            {!success && (
                <div className="grid gap-2">
                    <Label
                      htmlFor="email"
                      className={cn(
                        'block text-sm font-medium mb-2 transition-colors duration-500',
                        direction === 'rtl' ? 'text-right' : 'text-left',
                      )}
                      style={{ color: 'var(--muted-text)'}}
                    >
                      {t('auth.forgotPassword.emailLabel')}
                    </Label>
                    <div className="relative">
                         <div
                           className={cn(
                             'absolute inset-y-0 flex items-center pointer-events-none text-gray-400 transition-colors duration-500',
                             direction === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3',
                           )}
                         >
                            <i className="fas fa-envelope text-gray-400"></i>
                        </div>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('auth.forgotPassword.emailPlaceholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={cn(
                            'input-futuristic w-full py-3 px-4 rounded-lg focus:outline-none',
                            direction === 'rtl' ? 'pr-10 text-right' : 'pl-10 text-left',
                          )}
                          disabled={loading}
                          required
                          inputMode="email"
                        />
                    </div>
                </div>
            )}

            {!success && (
                <button
                    type="submit"
                    className="btn-futuristic w-full py-3"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="inline h-4 w-4 animate-spin ms-2" />
                    ) : (
                    t('auth.forgotPassword.submit')
                    )}
                </button>
            )}
             <Button variant="link" asChild className="w-full text-indigo-400 hover:text-indigo-300">
                <Link href="/login">
                    <ArrowRight className="me-2 h-4 w-4 rtl:rotate-180" />
                    {t('auth.forgotPassword.backToLogin')}
                </Link>
            </Button>
          </form>
      </div>
    </div>
  );
}

