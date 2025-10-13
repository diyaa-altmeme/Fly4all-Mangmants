
"use client";

import { LoginForm } from "@/components/auth/login-form";
import Script from 'next/script';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function LoginPage() {
    const { theme } = useTheme();

    useEffect(() => {
        // Ensure particles.js script is loaded
        const scriptId = 'particles-js-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const initializeParticles = () => {
            if (window.particlesJS) {
                const particleColor = theme === 'dark' ? '#4f46e5' : '#7c3aed';
                window.particlesJS("particles-js", {
                    "particles": {
                        "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
                        "color": { "value": particleColor },
                        "shape": { "type": "circle" },
                        "opacity": { "value": 0.5, "random": false },
                        "size": { "value": 3, "random": true },
                        "line_linked": { "enable": true, "distance": 150, "color": particleColor, "opacity": 0.2, "width": 1 },
                        "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" }
                    },
                    "interactivity": { 
                        "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": false } },
                        "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 1 } } }
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
            const pjsDiv = document.getElementById('particles-js');
            if (pjsDiv) pjsDiv.innerHTML = '';
        }
    }, [theme]);


    return (
        <div className="login-page-body w-full min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="particles" id="particles-js"></div>
            <div className="gradient-bg absolute inset-0 z-0"></div>
            
            <div className="orb orb-1 floating pulse"></div>
            <div className="orb orb-2 floating pulse" style={{ animationDelay: '1s' }}></div>
            <div className="orb orb-3 floating pulse" style={{ animationDelay: '2s' }}></div>

            <div className="z-10 w-full max-w-md">
                <LoginForm />
            </div>
        </div>
    );
}
