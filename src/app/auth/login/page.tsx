"use client";

import { LoginForm } from "@/components/auth/login-form";
import Script from 'next/script';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';


declare global {
    interface Window {
        particlesJS: any;
        pJSDom: any[];
    }
}

export default function LoginPage() {
    const { theme } = useTheme();

    useEffect(() => {
        const scriptId = 'particles-js-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const initializeParticles = () => {
            if (window.particlesJS) {
                const particleColor = theme === 'dark' ? '#4f46e5' : '#7c3aed';
                const lineColor = theme === 'dark' ? '#4f46e5' : '#9333ea';
                
                window.particlesJS("particles-js", {
                    "particles": {
                        "number": { "value": 120, "density": { "enable": true, "value_area": 900 } },
                        "color": { "value": particleColor },
                        "shape": { "type": "circle" },
                        "opacity": { "value": 0.8, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.2, "sync": false } },
                        "size": { "value": 2.5, "random": true, "anim": { "enable": false } },
                        "line_linked": { "enable": true, "distance": 150, "color": lineColor, "opacity": 0.4, "width": 1 },
                        "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" }
                    },
                    "interactivity": { 
                        "detect_on": "canvas",
                        "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false } },
                        "modes": { "grab": { "distance": 150, "line_linked": { "opacity": 1 } } }
                    },
                     "retina_detect": true
                });
            }
        };

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
            script.onload = initializeParticles;
            document.body.appendChild(script);
        } else {
            initializeParticles();
        }

        return () => {
            if (window.pJSDom && window.pJSDom.length > 0) {
                 window.pJSDom[0].pJS.fn.vendors.destroypJS();
                 window.pJSDom = [];
            }
        }
    }, [theme]);


    return (
        <div className="login-page-body w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-4 left-4 z-50">
                <ThemeToggle />
            </div>
            <div className="particles" id="particles-js"></div>
            <div className="gradient-bg absolute inset-0 z-0 opacity-[0.07] dark:opacity-[0.15]"></div>
            
            <div className="orb orb-1 floating pulse"></div>
            <div className="orb orb-2 floating pulse" style={{ animationDelay: '1s' }}></div>
            <div className="orb orb-3 floating pulse" style={{ animationDelay: '2s' }}></div>

            <div className="z-10 w-full max-w-md">
                <LoginForm />
            </div>
        </div>
    );
}
