
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

const AnalogClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const hourDeg = (hours % 12) * 30 + minutes * 0.5;
    const minuteDeg = minutes * 6 + seconds * 0.1;
    const secondDeg = seconds * 6;

    const formattedDate = isValid(time) ? format(time, 'EEEE, d MMMM yyyy', { locale: ar }) : '';

    return (
        <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-4 bg-card rounded-xl border">
            <div className="relative w-40 h-40 border-4 border-primary rounded-full flex items-center justify-center shadow-lg bg-gradient-radial from-background to-primary/10">
                {/* Center dot */}
                <div className="absolute w-3 h-3 bg-primary rounded-full z-10 border-2 border-background"></div>
                
                {/* Hour hand */}
                <div
                    className="absolute w-1.5 h-12 bg-foreground rounded-t-full origin-bottom"
                    style={{ transform: `rotate(${hourDeg}deg)`, top: 'calc(50% - 3rem)' }}
                ></div>

                {/* Minute hand */}
                <div
                    className="absolute w-1 h-16 bg-foreground rounded-t-full origin-bottom"
                    style={{ transform: `rotate(${minuteDeg}deg)`, top: 'calc(50% - 4rem)' }}
                ></div>

                {/* Second hand */}
                <div
                    className="absolute w-0.5 h-16 bg-accent rounded-t-full origin-bottom"
                    style={{ transform: `rotate(${secondDeg}deg)`, top: 'calc(50% - 4rem)' }}
                ></div>
                
                {/* Numbers */}
                {[...Array(12)].map((_, i) => {
                    const angle = (i + 1) * 30;
                    const x = 50 + 40 * Math.sin(angle * Math.PI / 180);
                    const y = 50 - 40 * Math.cos(angle * Math.PI / 180);
                    return (
                        <div
                            key={i}
                            className="absolute font-bold text-primary text-sm"
                            style={{ 
                                left: `${x}%`, 
                                top: `${y}%`,
                                transform: `translate(-50%, -50%)`
                             }}
                        >
                             {i + 1}
                        </div>
                    )
                })}

            </div>
             <div className="mt-4 text-center">
                <p className="font-bold text-foreground text-lg">{formattedDate}</p>
            </div>
        </div>
    );
};

export default AnalogClock;

    