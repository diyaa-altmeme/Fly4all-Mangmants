
'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane } from 'lucide-react'

export default function SignInPage() {

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('An error occurred during Google sign-in:', error)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center py-12">
            <Card className="mx-auto max-w-sm">
                <CardHeader className="text-center">
                    <Plane className="h-8 w-8 mx-auto text-primary"/>
                    <CardTitle className="text-3xl font-bold">Mudarib</CardTitle>
                    <CardDescription>
                        مرحبًا بك! قم بتسجيل الدخول للمتابعة
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                            تسجيل الدخول باستخدام جوجل
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
         <div className="hidden bg-muted lg:block">
                <div 
                    className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale" 
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=2071&auto=format&fit=crop')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            </div>
    </div>
  )
}
