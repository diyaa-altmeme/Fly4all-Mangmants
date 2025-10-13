
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import Preloader from '@/components/layout/preloader';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import './futuristic-login.css';
import Script from 'next/script';

const FuturisticLogin = () => {
    const [theme, setTheme] = useState('dark');

    const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        setTheme(newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (window.pJSDom && window.pJSDom.length > 0) {
            const pJS = window.pJSDom[0].pJS;
            pJS.particles.color.value = theme === 'dark' ? '#4f46e5' : '#7c3aed';
            pJS.particles.line_linked.color = theme === 'dark' ? '#4f46e5' : '#7c3aed';
            pJS.fn.particlesRefresh();
        }
    }, [theme]);
    
    return (
        <>
            <Script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js" strategy="afterInteractive" onReady={() => {
                if (window.particlesJS) {
                    window.particlesJS("particles-js", {
                        "particles": {
                            "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
                            "color": { "value": "#4f46e5" },
                            "shape": { "type": "circle" },
                            "opacity": { "value": 0.5, "random": false },
                            "size": { "value": 3, "random": true },
                            "line_linked": { "enable": true, "distance": 150, "color": "#4f46e5", "opacity": 0.2, "width": 1 },
                            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false },
                        },
                        "interactivity": {
                            "detect_on": "canvas",
                            "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" }, "resize": true },
                            "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 1 } } },
                        },
                        "retina_detect": true,
                    });
                }
            }}/>
             <div className="login-page-body w-full min-h-screen flex items-center justify-center p-4 overflow-hidden">
                <div className="theme-switch">
                    <label className="switch">
                        <input type="checkbox" id="theme-toggle" onChange={handleThemeChange} />
                        <span className="slider"></span>
                    </label>
                </div>
                <div id="particles-js" className="particles-container"></div>
                
                <LoginForm />
            </div>
        </>
    );
}


export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect them.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) {
    return <Preloader />;
  }
  
  // If no user and not loading, show the login form.
  return <FuturisticLogin />;
}
