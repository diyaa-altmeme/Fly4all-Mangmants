'use client';
import * as React from 'react';
import LoginPageClient from './components/login-page-client';

export default function LoginPage() {
    return (
        <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px] h-screen">
            <div className="flex items-center justify-center py-12">
                <LoginPageClient />
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
    );
}
