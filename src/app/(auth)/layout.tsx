
import { MainLayout } from '@/components/layout/main-layout';

// This is the layout for the auth pages like login, register, etc.
// It does not include the main app navigation.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
