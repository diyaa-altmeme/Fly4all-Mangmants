
'use client';

import { useEffect, useState } from 'react';
import { setInitialAdmin } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// UID for user "ضياء التميمي"
const ADMIN_UID = "5V2a9sFmEjZosRARbpA8deWhdVJ3";

export default function SetupAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSetup = async () => {
    setIsLoading(true);
    const res = await setInitialAdmin(ADMIN_UID);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">إعداد حساب المسؤول الأول</h1>
        <p className="text-center text-gray-600">
          انقر على الزر أدناه لتعيين المستخدم "ضياء التميمي" كمسؤول للنظام باستخدام المعرف:
          <br />
          <code className="block p-2 mt-2 text-sm text-gray-800 bg-gray-100 rounded">{ADMIN_UID}</code>
        </p>
        
        <Button 
          onClick={handleSetup} 
          disabled={isLoading || !!result} 
          className="w-full"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "جاري الإعداد..." : "بدء الإعداد"}
        </Button>

        {result && (
          <div className={`p-4 rounded text-center ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-semibold">{result.message}</p>
            {result.success && (
                <a href="/dashboard" className="mt-2 inline-block underline">الانتقال إلى لوحة التحكم</a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
