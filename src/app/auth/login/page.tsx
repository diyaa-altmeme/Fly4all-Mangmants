
'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane } from 'lucide-react'
import LoginPageClient from './components/login-page-client'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { app } from '@/lib/firebase'

export default function SignInPage() {

  const handleGoogleSignIn = async () => {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The redirect is handled by the onAuthStateChanged listener in MainLayout
    } catch (error) {
      console.error('An error occurred during Google sign-in:', error)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center py-12">
            <LoginPageClient />
        </div>
         <div className="hidden bg-muted lg:block">
                <div 
                    className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale" 
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=2070&auto=format&fit=crop')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            </div>
    </div>
  )
}
