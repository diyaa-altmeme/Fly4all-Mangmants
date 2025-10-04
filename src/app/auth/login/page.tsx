
import { getCurrentUserFromSession } from '@/app/auth/actions';
import LoginPageClient from './components/login-page-client';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
    const user = await getCurrentUserFromSession();

    if (user) {
        redirect('/dashboard');
    }

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <LoginPageClient />
            </div>
            <div className="hidden bg-muted lg:block relative">
                 <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbb563?q=80&w=2070&auto=format&fit=crop')"}}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent"/>
            </div>
        </div>
    );
}
