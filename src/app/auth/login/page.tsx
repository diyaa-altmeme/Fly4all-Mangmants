
"use client";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    // This page now directly renders the futuristic login form within its own context.
    return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
             {/* Animated Background */}
            <div className="particles" id="particles-js"></div>
            <div className="gradient-bg absolute inset-0 z-0"></div>
            
            {/* Floating Orbs */}
            <div className="orb orb-1 floating pulse"></div>
            <div className="orb orb-2 floating pulse" style={{animationDelay: '1s'}}></div>
            <div className="orb orb-3 floating pulse" style={{animationDelay: '2s'}}></div>

            <div className="z-10 w-full">
                <LoginForm />
            </div>
        </div>
    );
}
