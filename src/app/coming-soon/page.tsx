
"use client";

import React, { useState, useEffect } from 'react';
import { Rocket, Timer } from 'lucide-react';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 bg-black/30 text-cyan-300 font-mono text-2xl md:text-4xl p-4 rounded-lg shadow-lg border border-cyan-700/50">
      <Timer className="h-8 w-8" />
      <span>{formatTime(time)}</span>
    </div>
  );
};

export default function ComingSoonPage() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#00001a] via-[#000033] to-[#0d001a] text-white overflow-hidden">
      {/* Static stars */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9ImJsYWNrIiAvPjxyYWRpYWxHcmFkaWVudCBpZD0iZyIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAuMiIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIgLz48L3JhZGlhbEdyYWRpZW50PjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InVybCgjZykiIHg9IjEwJSIgeT0iMjAlIiAvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InVybCgjZykiIHg9IjgwJSIgeT0iMzAlIiAvPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9InVybCgjZykiIHg9IjQwJSIgeT0iNzAlIiAvPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9InVybCgjZykiIHg9IjYwJSIgeT0iNTAlIiAvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InVybCgjZykiIHg9Ijk1JSIgeT0iOTAlIiAvPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InVybCgjZykiIHg9IjI1JSIgeT0iNTUlIiAvPjwvc3ZnPg==')]"></div>
      
      <div className="text-center z-10 p-4">
        <div className="flex justify-center mb-6">
          <Rocket className="h-20 w-20 text-cyan-400 animate-pulse" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
          قريبًا جدًا
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          فريقنا يعمل خلف الكواليس لإطلاق ميزات جديدة ومذهلة ستحسن من تجربتكم على النظام. ترقبوا الإطلاق!
        </p>
        
        <DigitalClock />
      </div>
    </div>
  );
}
