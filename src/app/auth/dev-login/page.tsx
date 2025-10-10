
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { loginUser } from '@/lib/auth/actions';
import { Loader2 } from 'lucide-react';

function DevLoginComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No token provided. Cannot proceed with developer login.');
      return;
    }

    const processLogin = async () => {
      try {
        const userCredential = await signInWithCustomToken(auth, token);
        const idToken = await getIdToken(userCredential.user);
        const result = await loginUser(idToken);

        if (result.error) {
          throw new Error(result.error);
        }

        // Redirect to the dashboard after successful login
        router.push('/dashboard');
        // Force a full refresh to ensure all server components re-render with the new session
        window.location.href = '/dashboard';

      } catch (err: any) {
        console.error('Developer login failed:', err);
        setError(`Login failed: ${err.message}`);
      }
    };

    processLogin();
  }, [token, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-xl font-semibold">جاري تسجيل الدخول...</h1>
      <p className="text-muted-foreground">
        يتم الآن التحقق من جلسة المطور. سيتم توجيهك قريبًا.
      </p>
      {error && <p className="text-destructive mt-4">{error}</p>}
    </div>
  );
}


export default function DevLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DevLoginComponent />
        </Suspense>
    )
}
