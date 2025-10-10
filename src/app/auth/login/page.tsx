import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center pt-12">
      <div className="w-full max-w-md">
        {/* نموذج تسجيل الدخول */}
        <LoginForm />
      </div>
    </div>
  );
}
