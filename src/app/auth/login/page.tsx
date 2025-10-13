
"use client";

import { LoginForm } from "@/components/auth/login-form";
import Script from 'next/script';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function LoginPage() {
    const { theme } = useTheme();

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
        script.onload = () => {
            if (window.particlesJS) {
                const particleColor = theme === 'dark' ? '#4f46e5' : '#7c3aed';
                window.particlesJS("particles-js", {
                    "particles": {
                        "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                        "color": { "value": particleColor },
                        "shape": { "type": "circle" },
                        "opacity": { "value": 0.3, "random": true },
                        "size": { "value": 3, "random": true },
                        "line_linked": { "enable": true, "distance": 150, "color": particleColor, "opacity": 0.2, "width": 1 },
                        "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" }
                    },
                    "interactivity": { 
                        "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false } },
                        "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } }
                    }
                });
            }
        };
        document.body.appendChild(script);

        return () => {
            const pjsDiv = document.getElementById('particles-js');
            if (pjsDiv) pjsDiv.innerHTML = '';
            document.body.removeChild(script);
        }
    }, [theme]);


    return (
        <div className="login-page-body w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="particles" id="particles-js"></div>
            <div className="gradient-bg absolute inset-0 z-0"></div>
            
            <div className="orb orb-1 floating pulse" style={{ top: '10%', left: '15%', width: '150px', height: '150px', backgroundColor: 'hsl(var(--primary))' }}></div>
            <div className="orb orb-2 floating pulse" style={{ top: '60%', left: '70%', width: '200px', height: '200px', animationDelay: '2s', backgroundColor: 'hsl(var(--accent))' }}></div>
            <div className="orb orb-3 floating pulse" style={{ top: '30%', left: '90%', width: '100px', height: '100px', animationDelay: '4s', backgroundColor: 'hsl(var(--secondary))' }}></div>

            <div className="z-10 w-full max-w-md">
                <LoginForm />
            </div>
        </div>
    );
}
