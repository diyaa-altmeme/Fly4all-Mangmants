
'use client';

import React from 'react';
import FlightAnalysisContent from './components/flight-analysis-content';

export default function FlightAnalysisPage() {
    return (
        <div className="space-y-6">
            <div className="px-0 sm:px-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">تحليل بيانات الرحلات</h1>
                <p className="text-muted-foreground">
                    أداة متقدمة لتحليل بيانات ملفات الرحلات، كشف التكرار، حساب الخصومات، وتدقيق الأرباح.
                </p>
            </div>
            <FlightAnalysisContent />
        </div>
    );
}
